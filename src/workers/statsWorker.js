const STOPWORDS = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with',
  'by','from','as','is','was','are','were','be','been','being','have',
  'has','had','do','does','did','will','would','could','should','may',
  'might','it','its','i','me','my','we','our','you','your','he','him',
  'his','she','her','they','them','their','this','that','these','those',
  'what','which','who','how','when','where','why','all','any','both',
  'each','no','not','only','so','than','too','very','just','get','got',
  'im','ok','okay','oh','up','out','if','about','into','then','now',
  'here','there','also','back','yeah','yes','lol','haha','heh','like',
  'know','think','dont','cant','wont','thats','ive','id','ill','isnt',
  'wasnt','didnt','doesnt','havent','couldnt','wouldnt','shouldnt',
])

const URL_REGEX = /https?:\/\/[^\s]+|www\.[^\s]+/gi
const AUTO_AWAY_REGEX = /is (away|back)\s*[-–]/i

self.onmessage = ({ data: { events } }) => {
  const messages    = events.filter(e => e.type === 'message' && e.nick && e.text)
  const actions     = events.filter(e => e.type === 'action'  && e.nick)
  const joins       = events.filter(e => e.type === 'join')
  const quits       = events.filter(e => e.type === 'quit')
  const nickChanges = events.filter(e => e.type === 'nick')

  // ── ALIAS MAP ─────────────────────────────────────────────────────
  const aliasMap = {}
  for (const e of nickChanges) {
    if (!e.nick || !e.extra?.newNick) continue
    if (!aliasMap[e.nick])          aliasMap[e.nick]          = new Set()
    if (!aliasMap[e.extra.newNick]) aliasMap[e.extra.newNick] = new Set()
    aliasMap[e.nick].add(e.extra.newNick)
    aliasMap[e.extra.newNick].add(e.nick)
  }

  // ── PER-NICK ACCUMULATION ─────────────────────────────────────────
  const nickStats = {}

  const getNick = (nick) => {
    if (!nickStats[nick]) {
      nickStats[nick] = {
        nick, lines: 0, words: 0, chars: 0,
        capsLines: 0, questionLines: 0, exclLines: 0, shortLines: 0,
        actionCount: 0,
        hourly: new Array(24).fill(0),
        firstSeen: null, lastSeen: null,
        recentActivity: [], sampleQuotes: [],
        questionSamples: [], capsSamples: [], actionSamples: [],
      }
    }
    return nickStats[nick]
  }

  for (const e of messages) {
    const n    = getNick(e.nick)
    const text = e.text || ''
    const wordList = text.trim().split(/\s+/).filter(w => w.length > 0)

    n.lines++
    n.words += wordList.length
    n.chars += text.length

    if (wordList.length <= 3) n.shortLines++

    const letters = text.replace(/[^a-zA-Z]/g, '')
    if (letters.length >= 4) {
      const upper = (text.match(/[A-Z]/g) || []).length
      if (upper / letters.length > 0.7) {
        n.capsLines++
        if (n.capsSamples.length < 5) n.capsSamples.push(text)
      }
    }

    if (text.trimEnd().endsWith('?')) {
      n.questionLines++
      if (n.questionSamples.length < 5) n.questionSamples.push(text)
    }

    if (text.trimEnd().endsWith('!')) n.exclLines++

    if (e.timestamp) {
      const hour = parseInt(e.timestamp.split(':')[0], 10)
      if (!isNaN(hour) && hour >= 0 && hour < 24) n.hourly[hour]++
    }

    if (e.timestamp) {
      if (!n.firstSeen) n.firstSeen = e.timestamp
      n.lastSeen = e.timestamp
    }

    n.recentActivity.push({ timestamp: e.timestamp, type: 'message', text })
    if (n.recentActivity.length > 15) n.recentActivity.shift()

    if (text.length > 10 && text.length < 80 && n.sampleQuotes.length < 20) {
      n.sampleQuotes.push(text)
    }
  }

  for (const e of actions) {
    const n    = getNick(e.nick)
    const text = e.text || ''
    n.actionCount++

    if (AUTO_AWAY_REGEX.test(text)) continue

    if (n.actionSamples.length < 5) n.actionSamples.push(text)

    n.recentActivity.push({ timestamp: e.timestamp, type: 'action', text })
    if (n.recentActivity.length > 15) n.recentActivity.shift()
  }

  // ── HOURLY CHANNEL ACTIVITY ───────────────────────────────────────
  const hourly = new Array(24).fill(0)
  for (const e of messages) {
    if (e.timestamp) {
      const hour = parseInt(e.timestamp.split(':')[0], 10)
      if (!isNaN(hour) && hour >= 0 && hour < 24) hourly[hour]++
    }
  }

  // ── TIME OF DAY BUCKETS ───────────────────────────────────────────
  const todBuckets = { nightcrawlers: {}, morning: {}, afternoon: {}, evening: {} }
  for (const e of messages) {
    if (!e.timestamp || !e.nick) continue
    const hour = parseInt(e.timestamp.split(':')[0], 10)
    if (isNaN(hour)) continue
    const bucket = hour < 6 ? 'nightcrawlers' : hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'
    todBuckets[bucket][e.nick] = (todBuckets[bucket][e.nick] || 0) + 1
  }
  const timeOfDay = {}
  for (const key of Object.keys(todBuckets)) {
    timeOfDay[key] = Object.entries(todBuckets[key])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([nick, count]) => ({ nick, count }))
  }

  // ── WORD FREQUENCY ────────────────────────────────────────────────
  const wordCount = {}
  for (const e of messages) {
    if (!e.text) continue
    const words = e.text.toLowerCase()
      .replace(/https?:\/\/[^\s]+/g, '')
      .replace(/[^a-z0-9'\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOPWORDS.has(w) && !/^\d+$/.test(w))
    for (const w of words) {
      wordCount[w] = (wordCount[w] || 0) + 1
    }
  }
  const topWords = Object.entries(wordCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([word, count]) => ({ word, count }))

  // ── URL EXTRACTION ────────────────────────────────────────────────
  const urls = []
  for (const e of messages) {
    if (!e.text) continue
    const found = e.text.match(URL_REGEX)
    if (found) {
      for (const url of found) {
        urls.push({ url, nick: e.nick, timestamp: e.timestamp })
      }
    }
  }

  // ── SUMMARY ───────────────────────────────────────────────────────
  const totalWords = messages.reduce((sum, e) => {
    return sum + (e.text ? e.text.trim().split(/\s+/).filter(w => w.length > 0).length : 0)
  }, 0)

  const summary = {
    totalMessages:  messages.length,
    totalActions:   actions.length,
    totalJoins:     joins.length,
    totalQuits:     quits.length,
    uniqueChatters: Object.keys(nickStats).length,
    totalWords,
    totalUrls:      urls.length,
  }

  // ── TOP CHATTERS ──────────────────────────────────────────────────
  const topChatters = Object.values(nickStats)
    .filter(n => n.lines > 0)
    .sort((a, b) => b.lines - a.lines)
    .map((n, i) => ({
      rank:            i + 1,
      nick:            n.nick,
      lines:           n.lines,
      words:           n.words,
      chars:           n.chars,
      avgWords:        n.lines > 0 ? Math.round(n.words / n.lines * 10) / 10 : 0,
      avgChars:        n.lines > 0 ? Math.round(n.chars / n.lines * 10) / 10 : 0,
      capsRatio:       n.lines > 0 ? Math.round(n.capsLines     / n.lines * 100) : 0,
      questionRatio:   n.lines > 0 ? Math.round(n.questionLines / n.lines * 100) : 0,
      exclRatio:       n.lines > 0 ? Math.round(n.exclLines     / n.lines * 100) : 0,
      shortLines:      n.shortLines,
      actionCount:     n.actionCount,
      hourly:          n.hourly,
      firstSeen:       n.firstSeen,
      lastSeen:        n.lastSeen,
      aliases:         aliasMap[n.nick] ? [...aliasMap[n.nick]] : [],
      questionSamples: n.questionSamples,
      capsSamples:     n.capsSamples,
      actionSamples:   n.actionSamples,
      recentActivity:  n.recentActivity
        .filter(a => a.type === 'message')
        .slice(-10),
      sampleQuote:     n.sampleQuotes.length > 0
        ? n.sampleQuotes[Math.floor(n.sampleQuotes.length / 2)]
        : null,
    }))

  self.postMessage({
    type: 'done',
    stats: {
      summary,
      hourly,
      timeOfDay,
      topChatters,
      topWords,
      urls: urls.slice(0, 100),
    },
  })
}