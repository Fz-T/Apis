 import { NextResponse } from "next/server"
import axios from "axios"

async function ytdl(url: string) {
  const headers = {
    "accept": "*/*",
    "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
    "sec-ch-ua": "\"Not A(Brand\";v=\"8\", \"Chromium\";v=\"132\"",
    "sec-ch-ua-mobile": "?1",
    "sec-ch-ua-platform": "\"Android\"",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "cross-site",
    "Referer": "https://id.ytmp3.mobi/",
    "Referrer-Policy": "strict-origin-when-cross-origin"
  };

  try {
    const initial = await axios.get(`https://d.ymcdn.org/api/v1/init?p=y&23=1llum1n471&_=${Math.random()}`, { headers });
    const init = initial.data;

    const idMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:.*v=|.*\/|.*embed\/))([^&?/]+)/);
    if (!idMatch) throw new Error("No se pudo extraer el ID del video.");
    const id = idMatch[1];

    const convertURL = `${init.convertURL}&v=${id}&f=mp4&_=${Math.random()}`;
    const converts = await axios.get(convertURL, { headers });
    const convert = converts.data;

    let info = {};
    for (let i = 0; i < 3; i++) {
      const progressResponse = await axios.get(convert.progressURL, { headers });
      info = progressResponse.data;
      if (info.progress === 3) break;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return {
      url: convert.downloadURL,
      title: info.title
    };
  } catch (error: any) {
    return { status: false, error: error.message };
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoUrl = searchParams.get("url");

  if (!videoUrl) {
    return NextResponse.json({
      status: false,
      error: "URL del video requerida."
    }, { status: 400 });
  }

  try {
    const result = await ytdl(videoUrl);

    if (!result.url) {
      return NextResponse.json({
        status: false,
        error: "No se pudo obtener la URL de descarga."
      }, { status: 400 });
    }

    const response = await axios.get(result.url, { responseType: 'stream' });

    return new NextResponse(response.data, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="${result.title || 'video'}.mp4"`
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      status: false,
      error: error.message
    }, { status: 500 });
  }
}
