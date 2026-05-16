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
const LAUGH_WORDS = new Set(['lol','haha','hehe','rofl','lmao','hah','xd','lmfao','ha','lololol'])

const EMOTICONS = [
  ':)', ':D', ':P', ':(', ';)', 'xD', 'XD', ':3', ':o', ':O',
  ':-)', ':-D', ':-P', ':-(', ';-)', 'o_O', '^_^', ':p', ';p',
]

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

  // ── DAY TRACKING — detect day boundaries via timestamp rollback ────
  const messagesByDay = [[]]
  let lastHourSeen = -1
  for (const e of messages) {
  if (!e.timestamp) { messagesByDay[messagesByDay.length - 1].push(e); continue }
  const hour = parseInt(e.timestamp.split(':')[0], 10)
  if (!isNaN(hour)) {
    // New day if: classic midnight rollover OR hour goes backwards by more than 2 hours
    const hourDiff = lastHourSeen === -1 ? 0 : hour - lastHourSeen
    if ((lastHourSeen > 20 && hour < 4) || (lastHourSeen !== -1 && hourDiff < -2)) {
      messagesByDay.push([])
    }
    lastHourSeen = hour
  }
  messagesByDay[messagesByDay.length - 1].push(e)
}

  // ── ACTIVITY HEATMAP — day x hour grid ───────────────────────────
  // Cap at 60 days for performance, aggregate older days into weeks
  const maxDays = 60
  const heatmapRaw = messagesByDay.map((dayMsgs, day) => {
    const hours = new Array(24).fill(0)
    for (const e of dayMsgs) {
      const hour = parseInt(e.timestamp?.split(':')[0], 10)
      if (!isNaN(hour) && hour >= 0 && hour < 24) hours[hour]++
    }
    return { day: day + 1, hours, total: dayMsgs.length }
  })
  const heatmap = heatmapRaw.slice(-maxDays)

  // ── NICK ACTIVITY OVER TIME — top 5 chatters by day ──────────────
  const top5nicks = Object.values(nickStats)
    .sort((a, b) => b.lines - a.lines)
    .slice(0, 5)
    .map(n => n.nick)

  const nickTimeline = {}
  for (const nick of top5nicks) nickTimeline[nick] = new Array(messagesByDay.length).fill(0)

  for (let d = 0; d < messagesByDay.length; d++) {
    for (const e of (messagesByDay[d] || [])) {
      if (nickTimeline[e.nick] !== undefined) nickTimeline[e.nick][d]++
    }
  }

  const nickActivityData = messagesByDay.map((_, d) => {
    const point = { day: d + 1 }
    for (const nick of top5nicks) point[nick] = nickTimeline[nick][d] || 0
    return point
  })

  // ── EMOTICON STATS ────────────────────────────────────────────────
  const emoticonCount = {}
  for (const e of messages) {
    if (!e.text) continue
    const text = e.text
    for (const em of EMOTICONS) {
      if (text.includes(em)) {
        emoticonCount[em] = (emoticonCount[em] || 0) + 1
      }
    }
    // Also count laugh words
    const lower = text.toLowerCase()
    const words = lower.split(/\s+/)
    for (const w of words) {
      if (LAUGH_WORDS.has(w)) {
        emoticonCount[w] = (emoticonCount[w] || 0) + 1
      }
    }
  }
  const topEmoticons = Object.entries(emoticonCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([emoticon, count]) => ({ emoticon, count }))

  // ── RELATIONSHIP MAP — nick mentions ──────────────────────────────
  const nickSetLower = new Set(Object.keys(nickStats).map(n => n.toLowerCase()))
  const mentionPairs = {}
  const sampleEvery = messages.length > 50000 ? 2 : 1
  for (let i = 0; i < messages.length; i += sampleEvery) {
    const e = messages[i]
    if (!e.text || !e.nick) continue
    const senderLower = e.nick.toLowerCase()
    const words = e.text.toLowerCase().split(/\s+/)
    for (const word of words) {
      const clean = word.replace(/[^a-z0-9_-]/g, '')
      if (clean.length > 1 && clean !== senderLower && nickSetLower.has(clean)) {
        const key = e.nick + '|' + clean
        mentionPairs[key] = (mentionPairs[key] || 0) + 1
      }
    }
  }
  const topMentions = Object.entries(mentionPairs)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([pair, count]) => {
      const parts = pair.split('|')
      return { from: parts[0], to: parts[1], count }
    })

  // ── CONVERSATION STARTERS — who posts after silence ───────────────
  const starterCount = {}
  let lastMinute = -1
  let lastNickSeen = null
  for (const e of messages) {
    if (!e.timestamp || !e.nick) continue
    const parts = e.timestamp.split(':').map(Number)
    const minute = parts[0] * 60 + parts[1]
    const gap = minute >= lastMinute
      ? minute - lastMinute
      : (1440 - lastMinute) + minute
    if (gap > 5 && gap < 480 && lastNickSeen !== e.nick) {
      starterCount[e.nick] = (starterCount[e.nick] || 0) + 1
    }
    lastMinute = minute
    lastNickSeen = e.nick
  }
  const topStarters = Object.entries(starterCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([nick, count]) => ({ nick, count }))

  // ── CHANNEL MOOD OVER TIME ────────────────────────────────────────
  const moodData = messagesByDay.map((dayMsgs, d) => {
    if (dayMsgs.length === 0) return { day: d + 1, laughter: 0, questions: 0, caps: 0 }
    let laughter = 0, questions = 0, caps = 0
    for (const e of dayMsgs) {
      if (!e.text) continue
      const words = e.text.toLowerCase().split(/\s+/)
      if (words.some(w => LAUGH_WORDS.has(w))) laughter++
      if (e.text.trimEnd().endsWith('?')) questions++
      const letters = e.text.replace(/[^a-zA-Z]/g, '')
      if (letters.length >= 4) {
        const upper = (e.text.match(/[A-Z]/g) || []).length
        if (upper / letters.length > 0.7) caps++
      }
    }
    const total = dayMsgs.length
    return {
      day: d + 1,
      laughter: Math.round(laughter / total * 100),
      questions: Math.round(questions / total * 100),
      caps: Math.round(caps / total * 100),
    }
  })

  // ── MOST ACTIVE DAY ───────────────────────────────────────────────
  const mostActiveDay = messagesByDay
    .map((msgs, d) => ({ day: d + 1, count: msgs.length }))
    .sort((a, b) => b.count - a.count)[0] || { day: 1, count: 0 }

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
    for (const w of words) wordCount[w] = (wordCount[w] || 0) + 1
  }
  const topWords = Object.entries(wordCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 100)
    .map(([word, count]) => ({ word, count }))

  // ── URL EXTRACTION ────────────────────────────────────────────────
  const urls = []
  for (const e of messages) {
    if (!e.text) continue
    const found = e.text.match(URL_REGEX)
    if (found) {
      for (const url of found) urls.push({ url, nick: e.nick, timestamp: e.timestamp })
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
    totalDays:      messagesByDay.length,
    mostActiveDay,
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
      recentActivity:  n.recentActivity.filter(a => a.type === 'message').slice(-10),
      sampleQuote:     n.sampleQuotes.length > 0 ? n.sampleQuotes[Math.floor(n.sampleQuotes.length / 2)] : null,
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
      // Pro stats
      heatmap,
      nickActivityData,
      top5nicks,
      topEmoticons,
      topMentions,
      topStarters,
      moodData,
    },
  })
}