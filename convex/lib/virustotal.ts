/**
 * VirusTotal API Client
 * 
 * Optional integration for scanning external URLs found in skills.
 * Disabled if VIRUSTOTAL_API_KEY is not set.
 * 
 * Free tier: 4 req/min, 500 req/day
 * 
 * @see https://docs.virustotal.com/reference/overview
 */

export interface VTUrlScanResult {
  url: string
  positives: number
  total: number
  permalink: string
  scanDate: string
  status: 'clean' | 'suspicious' | 'malicious' | 'unknown'
}

export interface VTScanSummary {
  scannedUrls: string[]
  results: VTUrlScanResult[]
  totalPositives: number
  totalScanned: number
  hasThreats: boolean
}

/**
 * Check if VirusTotal is configured
 */
export function isVTConfigured(): boolean {
  return !!process.env.VIRUSTOTAL_API_KEY
}

/**
 * Extract URLs from skill content that should be scanned
 * Focuses on executable/downloadable URLs
 */
export function extractScannableUrls(content: string): string[] {
  const urlRegex = /https?:\/\/[^\s"'<>)}\]]+/gi
  const matches = content.match(urlRegex) || []
  
  // Filter for potentially dangerous URLs (downloads, scripts, executables)
  const dangerousPatterns = [
    /\.exe$/i,
    /\.msi$/i,
    /\.dmg$/i,
    /\.pkg$/i,
    /\.sh$/i,
    /\.bash$/i,
    /\.ps1$/i,
    /\.bat$/i,
    /\.cmd$/i,
    /\.zip$/i,
    /\.tar\.gz$/i,
    /\.tar$/i,
    /\.rar$/i,
    /\.7z$/i,
    /github\.com\/.*\/releases/i,
    /raw\.githubusercontent\.com/i,
    /glot\.io/i,
    /pastebin\.com/i,
    /hastebin\.com/i,
  ]
  
  return [...new Set(matches.filter(url => 
    dangerousPatterns.some(pattern => pattern.test(url))
  ))]
}

/**
 * Submit a URL to VirusTotal for scanning
 */
async function submitUrlForScan(url: string): Promise<string> {
  const apiKey = process.env.VIRUSTOTAL_API_KEY
  if (!apiKey) {
    throw new Error('VIRUSTOTAL_API_KEY not configured')
  }

  const response = await fetch('https://www.virustotal.com/api/v3/urls', {
    method: 'POST',
    headers: {
      'x-apikey': apiKey,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `url=${encodeURIComponent(url)}`,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`VT URL submission failed: ${response.status} - ${error}`)
  }

  const data = await response.json()
  // Returns analysis ID
  return data.data?.id
}

/**
 * Get URL analysis results from VirusTotal
 */
async function getUrlAnalysis(urlId: string): Promise<VTUrlScanResult | null> {
  const apiKey = process.env.VIRUSTOTAL_API_KEY
  if (!apiKey) {
    throw new Error('VIRUSTOTAL_API_KEY not configured')
  }

  // URL ID is base64 encoded URL without padding
  const response = await fetch(`https://www.virustotal.com/api/v3/urls/${urlId}`, {
    headers: {
      'x-apikey': apiKey,
    },
  })

  if (response.status === 404) {
    return null // URL not yet analyzed
  }

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`VT URL analysis failed: ${response.status} - ${error}`)
  }

  const data = await response.json()
  const stats = data.data?.attributes?.last_analysis_stats || {}
  const positives = (stats.malicious || 0) + (stats.suspicious || 0)
  const total = Object.values(stats).reduce((a: number, b) => a + (b as number), 0) as number

  let status: 'clean' | 'suspicious' | 'malicious' | 'unknown' = 'unknown'
  if (positives === 0) {
    status = 'clean'
  } else if (positives >= 5) {
    status = 'malicious'
  } else if (positives > 0) {
    status = 'suspicious'
  }

  return {
    url: data.data?.attributes?.url || '',
    positives,
    total,
    permalink: `https://www.virustotal.com/gui/url/${urlId}`,
    scanDate: data.data?.attributes?.last_analysis_date 
      ? new Date(data.data.attributes.last_analysis_date * 1000).toISOString()
      : new Date().toISOString(),
    status,
  }
}

/**
 * Scan multiple URLs and return aggregated results
 */
export async function scanUrls(urls: string[]): Promise<VTScanSummary> {
  if (!isVTConfigured()) {
    return {
      scannedUrls: [],
      results: [],
      totalPositives: 0,
      totalScanned: 0,
      hasThreats: false,
    }
  }

  const results: VTUrlScanResult[] = []
  
  for (const url of urls.slice(0, 10)) { // Limit to 10 URLs per skill
    try {
      // Submit URL for scanning
      await submitUrlForScan(url)
      
      // Wait a bit for analysis (VT recommends polling)
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Get URL ID (base64 without padding)
      const urlId = Buffer.from(url).toString('base64').replace(/=/g, '')
      
      // Get analysis results
      const result = await getUrlAnalysis(urlId)
      if (result) {
        results.push(result)
      }
    } catch (error) {
      console.error(`Failed to scan URL ${url}:`, error)
      // Continue with other URLs
    }
  }

  const totalPositives = results.reduce((sum, r) => sum + r.positives, 0)
  
  return {
    scannedUrls: urls,
    results,
    totalPositives,
    totalScanned: results.length,
    hasThreats: totalPositives > 0,
  }
}
