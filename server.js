 const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys");
 const express = require("express");
 const bodyParser = require("body-parser");
 const qrcode = require("qrcode-terminal");
 
 const app = express();
 app.use(bodyParser.json());
 const port = 3000;
 
 async function startWhatsApp() {
     try {
         console.log("🔄 Iniciando conexão com o WhatsApp...");
         const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");
 
         const sock = makeWASocket({
             auth: state,
             printQRInTerminal: true,
             browser: ["Ubuntu", "Chrome", "22.04.4"],
             syncFullHistory: false,  // Evita possíveis erros de sincronização
             markOnlineOnConnect: false,  // Reduz risco de bloqueio
             fireInitQueries: true,  // Evita sobrecarga inicial
             //legacy: true,  // Ativa o modo legacy
             defaultQueryTimeoutMs: 60000
         });
 
         sock.ev.on("creds.update", saveCreds);
 
         sock.ev.on("connection.update", ({ qr, connection, lastDisconnect }) => {
             if (qr) {
                 console.log("📸 Escaneie este QR Code para conectar:");
                 qrcode.generate(qr, { small: true });
             }
 
             if (connection === "open") {
                console.log("✅ Conectado ao WhatsApp!");
            } else if (connection === "close") {
                const motivo = lastDisconnect?.error?.output?.statusCode;
                console.log(`❌ Conexão fechada. Motivo: ${motivo || "desconhecido"}`);

                if (motivo === DisconnectReason.loggedOut) {
                    console.log("🚪 Logout detectado. É necessário escanear o QR Code novamente.");
                } else {
                    console.log("🔄 Tentando reconectar em 30 segundos...");
                    setTimeout(startWhatsApp, 30000);
                }
            }
 
             if (lastDisconnect?.error) {
                 console.error("⚠️ Erro de desconexão:", lastDisconnect.error);
             }
         });
 
         app.post("/send-message", async (req, res) => {
             const { number, message } = req.body;
             const formattedNumber = number.includes("@s.whatsapp.net") ? number : `${number}@s.whatsapp.net`;
 
             try {
                 await sock.sendMessage(formattedNumber, { text: message });
                 res.json({ status: "success", message: "Mensagem enviada!" });
             } catch (error) {
                 console.error("⚠️ Erro ao enviar mensagem:", error);
                 res.status(500).json({ status: "error", message: error.toString() });
             }
         });

 startWhatsApp();
 
 app.listen(port, () => {
     console.log(`📡 Servidor rodando na porta:${port}`);
 });
