import axios from "axios";

const BASE_URL = (process.env.EVOLUTION_API_URL ?? "").replace(/\/$/, "");
const API_KEY = process.env.EVOLUTION_API_KEY ?? "";
const INSTANCE = process.env.EVOLUTION_INSTANCE ?? "";

const client = axios.create({
  baseURL: BASE_URL,
  headers: { apikey: API_KEY },
});

export async function sendText(phone: string, message: string) {
  const number = phone.replace(/\D/g, "");
  const { data } = await client.post(`/message/sendText/${INSTANCE}`, {
    number,
    text: message,
  });
  return data;
}

export async function sendMedia(phone: string, mediaUrl: string, mediaType: "image" | "video" | "document", caption?: string) {
  const number = phone.replace(/\D/g, "");
  const { data } = await client.post(`/message/sendMedia/${INSTANCE}`, {
    number,
    mediaUrl,
    mediatype: mediaType,
    caption: caption || undefined,
  });
  return data;
}

export async function sendMediaBase64(
  phone: string,
  base64: string,
  mimeType: string,
  fileName: string,
  mediaType: "image" | "video" | "audio" | "document",
  caption?: string
) {
  const number = phone.replace(/\D/g, "");
  const { data } = await client.post(`/message/sendMedia/${INSTANCE}`, {
    number,
    mediatype: mediaType,
    mimetype: mimeType,
    media: base64,
    fileName,
    caption: caption || undefined,
  });
  return data;
}

export async function getMediaBase64(rawData: any): Promise<{ base64: string; mimetype: string } | null> {
  try {
    const { data } = await client.post(`/chat/getBase64FromMediaMessage/${INSTANCE}`, {
      message: rawData,
    });
    return data;
  } catch {
    return null;
  }
}

export async function sendLink(phone: string, link: string, title?: string, description?: string) {
  const number = phone.replace(/\D/g, "");
  const text = title ? `*${title}*\n${description ? description + "\n" : ""}${link}` : link;
  const { data } = await client.post(`/message/sendText/${INSTANCE}`, {
    number,
    text,
    options: { linkPreview: true },
  });
  return data;
}

export async function getInstanceStatus() {
  try {
    const { data } = await client.get(`/instance/fetchInstances`);
    return data;
  } catch {
    return null;
  }
}

export async function getChats() {
  const { data } = await client.get(`/chat/findChats/${INSTANCE}`);
  return data;
}

export async function getMessages(remoteJid: string, count = 20) {
  const { data } = await client.post(`/chat/findMessages/${INSTANCE}`, {
    where: { key: { remoteJid } },
    limit: count,
  });
  return data;
}
