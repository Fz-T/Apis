import { NextResponse } from "next/server"
import { siteConfig } from "@/lib/config"
import { memoryCache } from "@/lib/cache"
import axios from "axios"

// Cache TTL in seconds for successful responses
const CACHE_TTL = 1800 // 30 minutes

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
      api = mth[1];
    }

    return api;
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
      return { error: "[ ERROR ] Formato no disponible!" }
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

      if (wit.data.progress > 999 && wit.data.success == 1) {
        response = wit.data;
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 5_000));
    }

    return response;
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
  const format = "360" //searchParams.get("format") || "mp3"

  if (!url) {
    return NextResponse.json({
      status: false,
      creator: siteConfig.api.creator,
      error: "URL is required",
    }, {
      status: 400,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    })
  }

  try {
    const cacheKey = `youtube-${url}-${format}`
    const cachedResponse = memoryCache.get(cacheKey)
    if (cachedResponse) {
      return new NextResponse(
        JSON.stringify({
          status: true,
          creator: siteConfig.api.creator,
          result: cachedResponse,
          cached: true,
          version: "v1",
        }, null, 2),
        {
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "public, max-age=1800, s-maxage=3600",
          },
        }
      )
    }

    const yt = new YTDL()
    await yt.Info(url)
    const video = await yt.Dl(format)

    if (video.error) {
      return new NextResponse(
        JSON.stringify({
          status: false,
          creator: siteConfig.api.creator,
          error: video.error,
        }, null, 2),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
          },
        }
      )
    }

    memoryCache.set(cacheKey, video, CACHE_TTL)

    return new NextResponse(
      JSON.stringify({
        status: true,
        creator: siteConfig.api.creator,
        result: video,
        version: "v1",
      }, null, 2),
      {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "public, max-age=1800, s-maxage=3600",
        },
      }
    )
  } catch (error) {
    return new NextResponse(
      JSON.stringify({
        status: false,
        creator: siteConfig.api.creator,
        error: error instanceof Error ? error.message : "An error occurred",
      }, null, 2),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
        },
      }
    )
  }
      }
