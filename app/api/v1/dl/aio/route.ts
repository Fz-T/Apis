 import { NextResponse } from "next/server"
import { siteConfig } from "@/lib/config"
import { memoryCache } from "@/lib/cache"
import { fetch } from "undici"

// Cache TTL in seconds for successful responses
const CACHE_TTL = 1800 // 30 minutes

async function aio(url) {
    try {
        const response = await fetch("https://anydownloader.com/wp-json/aio-dl/video-data/", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Referer": "https://anydownloader.com/",
                "Token": "5b64d1dc13a4b859f02bcf9e572b66ea8e419f4b296488b7f32407f386571a0d"
            },
            body: new URLSearchParams({ url }),
        });

        const data = await response.json();
        if (!data.url) return { status: false, error: "Failed to fetch video URL." }
        return { status: true, data }
    } catch (error) {
        return { status: false, error: error.message }
    }
}

export async function GET(request) {
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
        const cacheKey = `anydownloader-${url}`
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

        const result = await aio(url)

        if (!result.status) {
            return new NextResponse(
                JSON.stringify({
                    status: false,
                    creator: siteConfig.api.creator,
                    error: result.error,
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

        memoryCache.set(cacheKey, result.data, CACHE_TTL)

        return new NextResponse(
            JSON.stringify({
                status: true,
                creator: siteConfig.api.creator,
                result: result.data,
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
                error: error.message,
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
