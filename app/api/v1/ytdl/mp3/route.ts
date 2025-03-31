 import { NextResponse } from "next/server"
import fs from 'fs';
import axios from "axios";
import * as cheerio from "cheerio";
import { pipeline } from 'stream';
import { promisify } from 'util';

const streamPipeline = promisify(pipeline);


const BASE = "https://ytmp3.so/en/youtube-4k-downloader"
const EMBED = "https://www.youtube.com/oembed?type=json&url=URLNYA"
const DOWNLOAD = "https://p.oceansaver.in/ajax/download.php"
const REG = /\&api=(\w+)\&/gi;
const FORMAT = [
  "mp3",
  "m4a",
  "webm",
  "aac",
  "flac",
  "opus",
  "ogg",
  "wav",

  "360",
  "480",
  "720",
  "1080",
  "1440",
  "4k"
]

class YTDL {
  constructor() {
    this.link = "";
  }

  async _getApi() {
    let api = "";

    const res = await axios({
      url: BASE,
      method: "GET",
    });

    const mth = res.data.match(REG);
    if (mth) {
      api = mth[1]
    }

    return api
  }

  async Info(link) {
    this.link = link;
    const res = await axios({
      url: EMBED.replace("URLNYA", link),
      method: "GET",
      responseType: "json"
    });

    return res.data;
  }

  async Dl(reso) {
    let response = {};

    if (!FORMAT.includes(reso)) {
      return console.log("[ ERROR ] Format tidak ada!")
    }
    const api = await this._getApi();
    const res = await axios({
      url: DOWNLOAD,
      method: "GET",
      responseType: "json",
      params: {
        copyright: "0",
        format: reso,
        url: this.link,
        api
      }
    });
    
    while (true) {
      const wit = await axios({
        url: res.data.progress_url,
        method: "GET",
        responseType: "json",
      });
      console.log("[ DOWNLOAD ] " + wit.data.text)

      if (wit.data.progress > 999 && wit.data.success == 1) {
        response = wit.data
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 5_000))
    }

    return response;
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
    const yt = new YTDL();
    const info = await yt.Info(videoUrl);
    const reso = "mp3";
    const audio = await yt.Dl(reso);

    if (!audio.download_url) {
      return NextResponse.json({
        status: false,
        error: "No se pudo obtener la URL de descarga."
      }, { status: 400 });
    }

    const response = await axios.get(audio.download_url, { responseType: 'stream' });

    const { readable, writable } = new TransformStream();
    streamPipeline(response.data, writable);

    return new NextResponse(readable, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": "attachment; filename=audio.mp3"
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      status: false,
      error: error.message
    }, { status: 500 });
  }
}
