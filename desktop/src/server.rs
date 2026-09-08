use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::{Arc, Mutex};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::mpsc;
use tokio_tungstenite::accept_hdr_async;
use tokio_tungstenite::tungstenite::handshake::server::{Request, Response};
use tokio_tungstenite::tungstenite::Message;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Device {
    pub id: String,
    pub name: String,
    pub platform: String,
    pub status: String,
    #[serde(rename = "ipAddress")]
    pub ip_address: Option<String>,
    #[serde(rename = "isCurrentDevice")]
    pub is_current_device: Option<bool>,
    #[serde(rename = "lastSync")]
    pub last_sync: Option<String>,
}

struct ConnectedClient {
    room_code: String,
    device: Option<Device>,
    sender: mpsc::UnboundedSender<Message>,
}

type ClientsMap = Arc<Mutex<HashMap<usize, ConnectedClient>>>;
type RoomHistoriesMap = Arc<Mutex<HashMap<String, Vec<Value>>>>;

pub fn start_embedded_server() {
    tauri::async_runtime::spawn(async move {
        let addr = "0.0.0.0:8080";
        let listener = match TcpListener::bind(addr).await {
            Ok(l) => l,
            Err(e) => {
                log::info!("[Embedded Sync Server] Port 8080 in use or failed to bind: {}. Standalone server might be active.", e);
                return;
            }
        };

        log::info!("[Embedded Sync Server] Running serverless WebSocket relay at ws://{}", addr);

        let clients: ClientsMap = Arc::new(Mutex::new(HashMap::new()));
        let room_histories: RoomHistoriesMap = Arc::new(Mutex::new(HashMap::new()));
        let mut next_client_id: usize = 1;

        while let Ok((stream, peer_addr)) = listener.accept().await {
            let client_id = next_client_id;
            next_client_id += 1;

            let clients_clone = Arc::clone(&clients);
            let histories_clone = Arc::clone(&room_histories);
            tauri::async_runtime::spawn(handle_connection(stream, peer_addr, client_id, clients_clone, histories_clone));
        }
    });
}

async fn handle_connection(
    stream: TcpStream,
    peer_addr: SocketAddr,
    client_id: usize,
    clients: ClientsMap,
    room_histories: RoomHistoriesMap,
) {
    let forwarded_ip_cell = Arc::new(Mutex::new(None::<String>));
    let ip_cell_clone = Arc::clone(&forwarded_ip_cell);

    let ws_stream = match accept_hdr_async(stream, move |req: &Request, response: Response| {
        if let Some(val) = req.headers().get("x-forwarded-for").or_else(|| req.headers().get("x-real-ip")) {
            if let Ok(s) = val.to_str() {
                let first_ip = s.split(',').next().unwrap_or(s).trim().to_string();
                if !first_ip.is_empty() {
                    *ip_cell_clone.lock().unwrap() = Some(first_ip);
                }
            }
        }
        Ok(response)
    }).await {
        Ok(ws) => ws,
        Err(e) => {
            log::warn!("[Embedded Sync Server] Error during WebSocket handshake: {}", e);
            return;
        }
    };

    let (mut ws_sender, mut ws_receiver) = ws_stream.split();
    let (tx, mut rx) = mpsc::unbounded_channel::<Message>();

    // Forward messages from rx channel to WebSocket stream
    tauri::async_runtime::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if ws_sender.send(msg).await.is_err() {
                break;
            }
        }
    });

    // Register initial unauthenticated client state
    {
        let mut map = clients.lock().unwrap();
        map.insert(
            client_id,
            ConnectedClient {
                room_code: String::new(),
                device: None,
                sender: tx.clone(),
            },
        );
    }

    while let Some(msg_result) = ws_receiver.next().await {
        let msg = match msg_result {
            Ok(m) => m,
            Err(_) => break,
        };

        if msg.is_text() {
            let text = match msg.to_text() {
                Ok(t) => t,
                Err(_) => continue,
            };

            let v: Value = match serde_json::from_str(text) {
                Ok(val) => val,
                Err(_) => continue,
            };

            let msg_type = v.get("type").and_then(|t| t.as_str()).unwrap_or("");

            match msg_type {
                "REGISTER_DEVICE" => {
                    let room_code = v.get("roomCode").and_then(|r| r.as_str()).unwrap_or("").to_string();
                    if let Some(device_val) = v.get("device") {
                        if let Ok(mut device) = serde_json::from_value::<Device>(device_val.clone()) {
                            let captured_ip = forwarded_ip_cell.lock().unwrap().clone();
                            let ip_str = peer_addr.ip().to_string();
                            let raw_ip = if let Some(f_ip) = captured_ip {
                                f_ip
                            } else if ip_str == "127.0.0.1" || ip_str == "::1" || ip_str.ends_with("127.0.0.1") {
                                get_local_ip().unwrap_or(ip_str)
                            } else {
                                ip_str
                            };

                            let clean_ip = raw_ip.replace("::ffff:", "");
                            device.ip_address = Some(clean_ip);

                            {
                                let mut map = clients.lock().unwrap();
                                if let Some(client) = map.get_mut(&client_id) {
                                    client.room_code = room_code.clone();
                                    client.device = Some(device);
                                }
                            }

                            broadcast_device_list(&clients, &room_code);

                            // Send Room History Catch-Up to Late-Joiner Device!
                            if !room_code.is_empty() {
                                let history_items = {
                                    let map = room_histories.lock().unwrap();
                                    map.get(&room_code).cloned()
                                };

                                if let Some(items) = history_items {
                                    if !items.is_empty() {
                                        let payload = serde_json::json!({
                                            "type": "ROOM_HISTORY_SYNC",
                                            "roomCode": room_code,
                                            "items": items
                                        });
                                        let _ = tx.send(Message::Text(payload.to_string().into()));
                                    }
                                }
                            }
                        }
                    }
                }
                "SYNC_CLIPBOARD_ITEM" => {
                    let room_code = v.get("roomCode").and_then(|r| r.as_str()).unwrap_or("").to_string();
                    if !room_code.is_empty() {
                        if let Some(item_val) = v.get("item") {
                            let mut map = room_histories.lock().unwrap();
                            let history = map.entry(room_code.clone()).or_insert_with(Vec::new);
                            let item_id = item_val.get("id").and_then(|i| i.as_str()).unwrap_or("");
                            if !history.iter().any(|i| i.get("id").and_then(|id| id.as_str()) == Some(item_id)) {
                                history.insert(0, item_val.clone());
                                if history.len() > 20 {
                                    history.pop();
                                }
                            }
                        }
                    }
                    broadcast_message_to_room(&clients, &room_code, client_id, &msg);
                }
                "DELETE_CLIPBOARD_ITEM" => {
                    let room_code = v.get("roomCode").and_then(|r| r.as_str()).unwrap_or("").to_string();
                    if !room_code.is_empty() {
                        if let Some(item_id) = v.get("itemId").and_then(|i| i.as_str()) {
                            let mut map = room_histories.lock().unwrap();
                            if let Some(history) = map.get_mut(&room_code) {
                                history.retain(|i| i.get("id").and_then(|id| id.as_str()) != Some(item_id));
                            }
                        }
                    }
                    broadcast_message_to_room(&clients, &room_code, client_id, &msg);
                }
                "CLEAR_ROOM_HISTORY" => {
                    let room_code = v.get("roomCode").and_then(|r| r.as_str()).unwrap_or("").to_string();
                    if !room_code.is_empty() {
                        let mut map = room_histories.lock().unwrap();
                        map.insert(room_code.clone(), Vec::new());
                    }
                    broadcast_message_to_room(&clients, &room_code, client_id, &msg);
                }
                _ => {}
            }
        }
    }

    // Handle Client Disconnect
    let room_to_notify = {
        let mut map = clients.lock().unwrap();
        let removed = map.remove(&client_id);
        removed.map(|c| c.room_code).unwrap_or_default()
    };

    if !room_to_notify.is_empty() {
        broadcast_device_list(&clients, &room_to_notify);
    }
}

fn broadcast_message_to_room(clients: &ClientsMap, room_code: &str, sender_id: usize, msg: &Message) {
    if room_code.is_empty() {
        return;
    }

    let map = clients.lock().unwrap();
    for (id, client) in map.iter() {
        if *id != sender_id && client.room_code == room_code {
            let _ = client.sender.send(msg.clone());
        }
    }
}

fn broadcast_device_list(clients: &ClientsMap, room_code: &str) {
    if room_code.is_empty() {
        return;
    }

    let map = clients.lock().unwrap();
    let room_devices: Vec<Device> = map
        .values()
        .filter(|c| c.room_code == room_code)
        .filter_map(|c| c.device.clone())
        .collect();

    let payload = serde_json::json!({
        "type": "DEVICE_LIST_UPDATE",
        "devices": room_devices
    });

    let msg = Message::Text(payload.to_string().into());
    for client in map.values().filter(|c| c.room_code == room_code) {
        let _ = client.sender.send(msg.clone());
    }
}

fn get_local_ip() -> Option<String> {
    use std::net::UdpSocket;
    let socket = UdpSocket::bind("0.0.0.0:0").ok()?;
    socket.connect("8.8.8.8:80").ok()?;
    socket.local_addr().ok().map(|addr| addr.ip().to_string())
}
