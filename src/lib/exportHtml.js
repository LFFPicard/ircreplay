/**
 * Generates a self-contained HTML stats page.
 * All data is inlined as JS — no external dependencies except Chart.js CDN.
 */
export function generateStatsHtml(session, stats) {
  const channel   = session.channel  || '#channel'
  const date      = session.date     || ''
  const dateEnd   = session.dateEnd  || ''
  const fileCount = session.fileCount || 1
  const dateRange = dateEnd ? `${date} to ${dateEnd}` : date

  const topChatters  = stats.topChatters.slice(0, 30)
  const hourly       = stats.hourly
  const topWords     = stats.topWords.slice(0, 30)
  const urls         = stats.urls.slice(0, 50)
  const summary      = stats.summary
  const timeOfDay    = stats.timeOfDay

  const HOUR_COLORS = [
    '#6366f1','#6366f1','#6366f1','#6366f1','#6366f1','#6366f1',
    '#f59e0b','#f59e0b','#f59e0b','#f59e0b','#f59e0b','#f59e0b',
    '#10b981','#10b981','#10b981','#10b981','#10b981','#10b981',
    '#3b82f6','#3b82f6','#3b82f6','#3b82f6','#3b82f6','#3b82f6',
  ]

  const hourlyChartData = JSON.stringify({
    labels: hourly.map((_, i) => `${i}:00`),
    datasets: [{
      data: hourly,
      backgroundColor: HOUR_COLORS,
      borderRadius: 3,
    }]
  })

  const topChattersChartData = JSON.stringify({
    labels: topChatters.slice(0, 15).map(c => c.nick),
    datasets: [{
      data: topChatters.slice(0, 15).map(c => c.lines),
      backgroundColor: '#10b981',
      borderRadius: 3,
    }]
  })

  const todSections = [
    { key: 'nightcrawlers', label: 'Nightcrawlers (0-6)'   },
    { key: 'morning',       label: 'Morning Birds (6-12)'  },
    { key: 'afternoon',     label: 'Afternoon (12-18)'     },
    { key: 'evening',       label: 'Evening (18-24)'       },
  ]

  const todHtml = todSections.map(s => {
    const entries = (timeOfDay[s.key] || []).slice(0, 5)
    const rows = entries.length === 0
      ? '<tr><td colspan="2" style="color:#6b7280;padding:4px 0">No activity</td></tr>'
      : entries.map((e, i) => `
          <tr>
            <td style="padding:2px 0;font-family:monospace;color:${i === 0 ? '#10b981' : '#9ca3af'}">${e.nick}</td>
            <td style="padding:2px 0;text-align:right;color:#6b7280">${e.count}</td>
          </tr>`).join('')
    return `
      <div style="flex:1;min-width:160px">
        <div style="font-weight:600;color:#d1d5db;margin-bottom:4px;font-size:13px">${s.label}</div>
        <table style="width:100%;border-collapse:collapse">${rows}</table>
      </div>`
  }).join('')

  const chattersRows = topChatters.map((c, i) => `
    <tr style="border-bottom:1px solid #374151">
      <td style="padding:6px 8px;color:#6b7280;font-family:monospace;font-size:12px">${i + 1}</td>
      <td style="padding:6px 8px;font-family:monospace;color:#10b981;font-weight:600">${c.nick}${c.aliases.length > 0 ? `<span style="color:#4b5563;font-size:11px;margin-left:4px">+${c.aliases.length} alias</span>` : ''}</td>
      <td style="padding:6px 8px;text-align:right;font-family:monospace;color:#d1d5db">${c.lines.toLocaleString()}</td>
      <td style="padding:6px 8px;text-align:right;font-family:monospace;color:#6b7280">${c.words.toLocaleString()}</td>
      <td style="padding:6px 8px;text-align:right;font-family:monospace;color:#6b7280">${c.avgWords}</td>
      <td style="padding:6px 8px;font-family:monospace;color:#4b5563;font-size:11px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.sampleQuote ? `"${c.sampleQuote}"` : ''}</td>
    </tr>`).join('')

  const maxWordCount = topWords[0]?.count || 1
  const wordsHtml = topWords.map(w => `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
      <span style="font-family:monospace;color:#9ca3af;font-size:13px;width:120px;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${w.word}</span>
      <div style="flex:1;background:#374151;border-radius:9999px;height:6px">
        <div style="background:#10b981;height:6px;border-radius:9999px;width:${Math.round((w.count / maxWordCount) * 100)}%"></div>
      </div>
      <span style="font-family:monospace;color:#6b7280;font-size:12px;width:60px;text-align:right">${w.count.toLocaleString()}</span>
    </div>`).join('')

  const urlsHtml = urls.length === 0 ? '<p style="color:#6b7280">No URLs found</p>' : urls.map(u => `
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px;font-size:13px">
      <span style="font-family:monospace;color:#10b981;flex-shrink:0">${u.nick}</span>
      <a href="${u.url.startsWith('http') ? u.url : `https://${u.url}`}" style="color:#60a5fa;word-break:break-all">${u.url}</a>
    </div>`).join('')

  const statCards = [
    { label: 'Messages',  value: summary.totalMessages.toLocaleString()  },
    { label: 'Chatters',  value: summary.uniqueChatters.toLocaleString() },
    { label: 'Words',     value: summary.totalWords.toLocaleString()     },
    { label: 'URLs',      value: summary.totalUrls.toLocaleString()      },
    { label: 'Joins',     value: summary.totalJoins.toLocaleString()     },
    { label: 'Quits',     value: summary.totalQuits.toLocaleString()     },
  ].map(s => `
    <div style="background:#1f2937;border-radius:8px;padding:12px;text-align:center;flex:1;min-width:80px">
      <div style="color:#10b981;font-family:monospace;font-size:20px;font-weight:bold">${s.value}</div>
      <div style="color:#6b7280;font-size:12px;margin-top:4px">${s.label}</div>
    </div>`).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${channel} Stats &mdash; IRCReplay</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"><\/script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #111827; color: #f9fafb; font-family: system-ui, sans-serif; padding: 24px; }
    .container { max-width: 960px; margin: 0 auto; }
    h2 { color: #d1d5db; font-size: 16px; margin-bottom: 12px; }
    .card { background: #1f2937; border-radius: 10px; padding: 20px; margin-bottom: 20px; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th { text-align: left; padding: 6px 8px; color: #6b7280; font-size: 12px; border-bottom: 1px solid #374151; font-weight: normal; }
    .footer { text-align: center; color: #4b5563; font-size: 12px; margin-top: 32px; padding-top: 16px; border-top: 1px solid #374151; }
    @media print {
      body { background: #fff; color: #000; }
      .card { background: #f9fafb; border: 1px solid #e5e7eb; }
      a { color: #1d4ed8; }
    }
    @media (max-width: 600px) { .grid2 { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
<div class="container">

  <div style="margin-bottom:24px">
    <h1 style="font-size:28px;font-weight:bold;color:#10b981;font-family:monospace">${channel}</h1>
    <p style="color:#6b7280;margin-top:4px">${dateRange}${fileCount > 1 ? ` &mdash; ${fileCount} files merged` : ''}</p>
    <p style="color:#4b5563;font-size:12px;margin-top:2px">Generated by <a href="https://ircreplay.app" style="color:#10b981">IRCReplay.app</a> on ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
  </div>

  <div class="card">
    <div style="display:flex;gap:12px;flex-wrap:wrap">${statCards}</div>
  </div>

  <div class="grid2">
    <div class="card">
      <h2>Activity by Hour</h2>
      <canvas id="hourlyChart" height="160"></canvas>
    </div>
    <div class="card">
      <h2>Time of Day Champions</h2>
      <div style="display:flex;flex-wrap:wrap;gap:16px">${todHtml}</div>
    </div>
  </div>

  <div class="card">
    <h2>Top Chatters by Volume</h2>
    <canvas id="chattersChart" height="120" style="margin-bottom:20px"></canvas>
    <table>
      <thead>
        <tr>
          <th>#</th><th>Nick</th><th style="text-align:right">Lines</th>
          <th style="text-align:right">Words</th><th style="text-align:right">Avg</th>
          <th>Sample Quote</th>
        </tr>
      </thead>
      <tbody>${chattersRows}</tbody>
    </table>
  </div>

  <div class="grid2">
    <div class="card">
      <h2>Most Used Words</h2>
      ${wordsHtml}
    </div>
    <div class="card">
      <h2>URLs Shared (${urls.length.toLocaleString()})</h2>
      ${urlsHtml}
    </div>
  </div>

  <div class="footer">
    Generated by <a href="https://ircreplay.app" style="color:#6b7280">IRCReplay.app</a>
    &mdash; &copy; 2026
  </div>

</div>
<script>
  const hourlyData = ${hourlyChartData};
  const chattersData = ${topChattersChartData};

  new Chart(document.getElementById('hourlyChart'), {
    type: 'bar',
    data: hourlyData,
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#6b7280', font: { size: 10 } }, grid: { color: '#1f2937' } },
        y: { ticks: { color: '#6b7280', font: { size: 10 } }, grid: { color: '#374151' } }
      }
    }
  });

  new Chart(document.getElementById('chattersChart'), {
    type: 'bar',
    data: chattersData,
    options: {
      indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#6b7280', font: { size: 10 } }, grid: { color: '#374151' } },
        y: { ticks: { color: '#9ca3af', font: { size: 11, family: 'monospace' } }, grid: { display: false } }
      }
    }
  });
<\/script>
</body>
</html>`
}

/**
 * Triggers a file download in the browser.
 */
export function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}