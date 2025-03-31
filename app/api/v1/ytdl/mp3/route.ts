 import { NextResponse } from "next/server"
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import axios from 'axios';
import { pipeline } from 'stream';
import { promisify } from 'util';

const streamPipeline = promisify(pipeline);

async function ytdl(url) {
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
  const initial = await fetch(`https://d.ymcdn.org/api/v1/init?p=y&23=1llum1n471&_=${Math.random()}`, { headers });
  const init = await initial.json();
  const id = url.match(/(?:youtu\.be\/|youtube\.com\/(?:.*v=|.*\/|.*embed\/))([^&?/]+)/)?.[1];
  const convertURL = init.convertURL + `&v=${id}&f=mp3&_=${Math.random()}`;

  const converts = await fetch(convertURL, { headers });
  const convert = await converts.json();

  let info = {};
  for (let i = 0; i < 3; i++) {
    const progressResponse = await fetch(convert.progressURL, { headers });
    info = await progressResponse.json();
    if (info.progress === 3) break;
  }

  const result = {
    url: convert.downloadURL,
    title: info.title
  };
  return result;
}

async function up(url: string, outputPath: string): Promise<string> {
    const tempPath = '/tmp/temp_audio.mp3';

    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream'
    });

    await streamPipeline(response.data, fs.createWriteStream(tempPath));

    return new Promise((resolve, reject) => {
        ffmpeg(tempPath)
            .audioBitrate('320k')
            .save(outputPath)
            .on('end', () => {
                fs.unlinkSync(tempPath);
                resolve(outputPath);
            })
            .on('error', (err) => {
                fs.unlinkSync(tempPath);
                reject(`Error al procesar el audio: ${err.message}`);
            });
    });
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const videoUrl = searchParams.get("url");

    if (!videoUrl) {
        return NextResponse.json({
            status: false,
            error: "Se requiere una URL de video."
        }, { status: 400 });
    }

    try {
        const audioData = await ytdl(videoUrl);
        const downloadUrl = audioData.url;
        const outputPath = '/tmp/audio.mp3';

        await up(downloadUrl, outputPath);

        const fileStream = fs.createReadStream(outputPath);
        
        return new NextResponse(fileStream as any, {
            status: 200,
            headers: {
                "Content-Type": "audio/mpeg",
                "Content-Disposition": `attachment; filename="${audioData.title || 'audio'}.mp3"`
            }
        });

    } catch (error: any) {
        return NextResponse.json({
            status: false,
            error: error.message
        }, { status: 500 });
    }
}
