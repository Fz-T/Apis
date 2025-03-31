 import { NextResponse } from "next/server"
import { siteConfig } from "@/lib/config"
import { memoryCache } from "@/lib/cache"
import axios from "axios"
import crypto from "crypto"

const CACHE_TTL = 1800 // 30 minutes

async function ytdl(link: string, format: string = '720') {
  const apiBase = "https://media.savetube.me/api";
  const apiCDN = "/random-cdn";
  const apiInfo = "/v2/info";
  const apiDownload = "/download";

  const decryptData = async (enc: string) => {
    try {
      const key = Buffer.from('C5D58EF67A7584E4A29F6C35BBC4EB12', 'hex');
      const data = Buffer.from(enc, 'base64');
      const iv = data.slice(0, 16);
      const content = data.slice(16);
      
      const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
      let decrypted = decipher.update(content);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      return JSON.parse(decrypted.toString());
    } catch (error) {
      return null;
    }
  };

  const request = async (endpoint: string, data: any = {}, method: 'post' | 'get' = 'post') => {
    try {
      const { data: response } = await axios({
        method,
        url: `${endpoint.startsWith('http') ? '' : apiBase}${endpoint}`,
        data: method === 'post' ? data : undefined,
        params: method === 'get' ? data : undefined,
        headers: {
          'accept': '*/*',
          'content-type': 'application/json',
          'origin': 'https://yt.savetube.me',
          'referer': 'https://yt.savetube.me/',
          'user-agent': 'Postify/1.0.0'
        }
      });
      return { status: true, data: response };
    } catch (error: any) {
      return { status: false, error: error.message };
    }
  };

  const youtubeID = link.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  if (!youtubeID) return { status: false, error: "No se pudo extraer el ID del video de la URL." };

  const qualityOptions = ['1080', '720', '480', '360', '240']; 
  try {
    const cdnRes = await request(apiCDN, {}, 'get');
    if (!cdnRes.status) return cdnRes;
    const cdn = cdnRes.data.cdn;

    const infoRes = await request(`https://${cdn}${apiInfo}`, { url: `https://www.youtube.com/watch?v=${youtubeID[1]}` });
    if (!infoRes.status) return infoRes;
    
    const decrypted = await decryptData(infoRes.data.data);
    if (!decrypted) return { status: false, error: "No se pudo descifrar la información del video." };

    let downloadUrl: string | null = null;
    for (const quality of qualityOptions) {
      const downloadRes = await request(`https://${cdn}${apiDownload}`, {
        id: youtubeID[1],
        downloadType: format === 'mp3' ? 'audio' : 'video',
        quality,
        key: decrypted.key
      });
      if (downloadRes.status && downloadRes.data.data.downloadUrl) {
        downloadUrl = downloadRes.data.data.downloadUrl;
        break;
      }
    }

    if (!downloadUrl) {
      return { status: false, error: "No se encontró un enlace de descarga disponible para el video." };
    }
    const fileResponse = await axios.head(downloadUrl); 
    const size = fileResponse.headers['content-length']; 

    return { downloadUrl, size };
    
  } catch (error: any) {
    return { status: false, error: error.message };
  }
}

export async function GET(request: Request) {
  if (siteConfig.maintenance.enabled) {
    return new NextResponse(
      JSON.stringify({
        status: siteConfig.maintenance.apiResponse.status,
        creator: siteConfig.api.creator,
        message: siteConfig.maintenance.apiResponse.message,
      }, null, 2),
      {
        status: 503,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
        },
      }
    )
  }

  const { searchParams } = new URL(request.url)
  const url = searchParams.get("url")
  const format = "720"

  if (!url) {
    return NextResponse.json({
      status: false,
      creator: siteConfig.api.creator,
      error: "Se requiere la URL del video",
    }, {
      status: 400,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    })
  }

  try {
    const cacheKey = `youtube-${url}-${format}`
    const cachedResponse = memoryCache.get(cacheKey)
    if (cachedResponse) {
      return NextResponse.json({
        status: true,
        creator: siteConfig.api.creator,
        result: cachedResponse,
        cached: true,
        version: "v1",
      })
    }

    const video = await ytdl(url, format)

    if (video.status === false) {
      return new NextResponse(
        JSON.stringify({
          status: false,
          creator: siteConfig.api.creator,
          error: video.error,
        }, null, 2),
        { status: 400 }
      )
    }

    const { downloadUrl, size } = video
    const response = await axios.get(downloadUrl, { responseType: 'stream' })

    return new NextResponse(response.data, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": size,
        "Content-Disposition": `attachment; filename="video.mp4"`,
        "Cache-Control": "public, max-age=1800, s-maxage=3600",
      }
    })
  } catch (error: any) {
    return new NextResponse(
      JSON.stringify({ status: false, error: error.message }, null, 2),
      { status: 500 }
    )
  }
}
