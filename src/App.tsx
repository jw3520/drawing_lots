import { useRef, useState, type CSSProperties } from 'react'
import { ArrowDown, ArrowRight, Check, CheckCheck, CircleHelp, Clover, Copy, Eye, Hand, Layers2, LoaderCircle, Minus, Plus, RotateCcw, ShieldCheck, Shuffle, Sparkles, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useDraw } from '@/hooks/use-draw'
import { MAX_GROUP_COUNT, MIN_GROUP_COUNT } from '@/lib/draw'
import { cn } from '@/lib/utils'

const steps = [
  { title: '참여할 조를 정해요', description: '조 개수를 설정해 주세요. 기본은 6개 조예요.' },
  { title: '두근두근, 3초 동안 섞어요', description: '섞기를 누르면 모든 카드가 가려지고 순서가 무작위로 정해져요.' },
  { title: '카드를 열어 순서를 확인해요', description: '원하는 카드를 눌러 하나씩, 또는 전체 공개로 한 번에 확인하세요.' },
]

function App() {
  const draw = useDraw()
  const boardRef = useRef<HTMLElement>(null)
  const copyRequestRef = useRef(0)
  const [countInput, setCountInput] = useState(String(draw.count))
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle')
  const mixing = draw.phase === 'mixing'
  const complete = draw.phase === 'complete'
  const ready = draw.phase === 'ready'
  const validCount = /^\d+$/.test(countInput) && Number(countInput) >= MIN_GROUP_COUNT && Number(countInput) <= MAX_GROUP_COUNT
  const status = mixing ? `순서를 섞고 있어요 · ${draw.secondsLeft}초` : complete ? '오늘의 순서가 정해졌어요!' : ready ? '모두 준비됐나요?' : '어떤 조가 먼저일까요?'
  const helper = mixing ? '잠깐만요! 행운이 자리를 찾고 있어요.' : complete ? '첫 번째 카드부터 차례대로 시작하면 돼요.' : ready ? '카드를 섞어 새로운 순서를 정해 보세요.' : '궁금한 카드를 눌러 하나씩 공개해 보세요.'

  function clearCopy() { copyRequestRef.current += 1; setCopyState('idle') }

  function updateCount(value: string) {
    setCountInput(value)
    if (/^\d+$/.test(value) && Number(value) >= MIN_GROUP_COUNT && Number(value) <= MAX_GROUP_COUNT && Number(value) !== draw.count) {
      draw.setCount(Number(value)); clearCopy()
    }
  }

  function commitCount() { setCountInput(String(draw.count)) }
  function changeCount(delta: number) {
    const next = Math.min(MAX_GROUP_COUNT, Math.max(MIN_GROUP_COUNT, draw.count + delta))
    updateCount(String(next))
  }
  function startShuffle() {
    clearCopy()
    draw.shuffle()
    if (window.matchMedia('(max-width: 800px)').matches) {
      boardRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' })
    }
  }
  async function copyResult() {
    const requestId = ++copyRequestRef.current
    try {
      await navigator.clipboard.writeText(`순서뽑기 결과\n${draw.groups.map((group, i) => `${i + 1}번째: ${group}조`).join('\n')}`)
      if (requestId === copyRequestRef.current) setCopyState('copied')
    } catch { if (requestId === copyRequestRef.current) setCopyState('error') }
  }

  return (
    <div className={cn("app-shell", !ready && "has-mobile-actions")}>
      <header className="site-header">
        <a className="brand" href="./" aria-label="순서뽑기 홈">
          <span className="brand-icon"><Layers2 size={23} strokeWidth={2.1} /></span>
          <span>순서뽑기<span className="brand-dot">.</span></span>
        </a>
        <Dialog>
          <DialogTrigger asChild><Button variant="ghost" className="help-button"><CircleHelp size={17} />사용 방법</Button></DialogTrigger>
          <DialogContent className="help-dialog">
            <DialogHeader><DialogTitle>순서 정하기, 이렇게 쉬워요</DialogTitle><DialogDescription>누구나 같은 확률로, 기분 좋은 시작을 만들어 보세요.</DialogDescription></DialogHeader>
            <ol className="help-steps">{steps.map((step, i) => <li key={step.title}><span>{i + 1}</span><div><h3>{step.title}</h3><p>{step.description}</p></div></li>)}</ol>
            <p className="dialog-note"><ShieldCheck size={18} />조는 중복 없이 무작위로 배치돼요. 이전과 같은 순서가 나올 수도 있어요.</p>
          </DialogContent>
        </Dialog>
      </header>

      <main className="main-content">
        <section className="hero" aria-labelledby="page-title">
          <div>
            <div className="eyebrow"><span />작은 선택, 공평한 시작</div>
            <h1 id="page-title">순서는 랜덤하게,<br className="mobile-break" /> 시작은 <span className="hero-highlight">즐겁게<svg viewBox="0 0 190 12" preserveAspectRatio="none" aria-hidden="true"><path d="M3 8 Q88 0 186 6" /></svg></span>.</h1>
            <p>누가 먼저 할지 고민될 때, 가볍게 섞고 하나씩 열어 보세요.</p>
          </div>
          <div className="hero-art" aria-hidden="true"><span className="art-spark">✳</span><span className="mini-card mini-card-back">?</span><span className="mini-card mini-card-front"><Clover size={29} strokeWidth={1.6} /></span><span className="art-dot" /></div>
        </section>

        <div className="workspace">
          <section ref={boardRef} className="draw-panel" aria-labelledby="board-title" data-testid="draw-board" data-phase={draw.phase}>
            <div className="board-header">
              <div className="board-heading"><h2 id="board-title">우리의 순서</h2><Badge variant="secondary" className="count-badge">{draw.count}개 조</Badge></div>
              <Button data-testid="reset-button" variant="ghost" size="sm" disabled={mixing || ready} onClick={() => { draw.reset(); clearCopy() }} className="reset-button"><RotateCcw size={14} />처음으로</Button>
            </div>
            <div className="board-status" role="status" aria-live="polite" aria-atomic="true">
              <span className={cn('status-icon', complete && 'status-complete', mixing && 'status-mixing')}>{mixing ? <Shuffle size={19} /> : complete ? <CheckCheck size={21} /> : ready ? <Sparkles size={19} /> : <Hand size={19} />}</span>
              <div><h3>{status}</h3><p>{helper}</p></div>
              {draw.phase === 'hidden' && <span className="reveal-counter"><strong>{draw.revealed.length}</strong> / {draw.count}</span>}
              {mixing && <span className="countdown" aria-hidden="true">0{draw.secondsLeft}</span>}
              {complete && <Badge className="done-badge">공개 완료</Badge>}
            </div>
            <div className={cn('cards-grid', mixing && 'is-mixing')}>
              {draw.groups.map((group, index) => {
                const visible = ready || draw.revealed.includes(index)
                const style = {
                  '--desktop-x': `${(1 - index % 3) * 109}%`,
                  '--desktop-y': `${((Math.ceil(Math.min(6, draw.count - Math.floor(index / 6) * 6) / 3) - 1) / 2 - Math.floor(index % 6 / 3)) * 118}%`,
                  '--mobile-x': `${(0.5 - index % 2) * 109}%`,
                  '--mobile-y': `${((Math.ceil(Math.min(6, draw.count - Math.floor(index / 6) * 6) / 2) - 1) / 2 - Math.floor(index % 6 / 2)) * 118}%`,
                  '--twist': `${(index % 2 === 0 ? -1 : 1) * (8 + index % 4 * 3)}deg`,
                  '--card-order': index,
                } as CSSProperties
                return <div className="card-slot" key={index} style={style}>
                  <div className="slot-label"><span>{String(index + 1).padStart(2, '0')}<span className="slot-suffix"> 번째</span></span>{!ready && visible && <Check size={13} className="slot-check" />}</div>
                  <button type="button" className={cn('draw-card', visible && 'is-visible', ready && 'is-ready', complete && 'is-complete')} data-testid={`draw-card-${index}`} data-state={mixing ? 'mixing' : visible ? 'visible' : 'hidden'} disabled={mixing || visible} onClick={() => draw.reveal(index)} aria-label={`${index + 1}번째 카드, ${visible ? `${group}조` : mixing ? '섞는 중' : '눌러서 공개'}`}>
                    <span className="card-face card-front" aria-hidden={!visible}>
                      <span className="card-corner">GROUP</span><Clover className="card-clover" size={18} strokeWidth={1.4} />
                      {visible && <span className="group-number" data-testid="group-number">{group}<span>조</span></span>}
                      <span className="card-bottom">{ready ? 'READY TO SHUFFLE' : <><span className="tiny-dot" />당신의 차례</>}</span>
                    </span>
                    <span className="card-face card-back" aria-hidden={visible}>
                      <span className="back-corner"><Layers2 size={17} /></span><span className="question-mark">?</span><span className="back-bottom">{mixing ? 'SHUFFLING' : '눌러서 공개'}</span><Sparkles className="back-spark" size={16} />
                    </span>
                  </button>
                </div>
              })}
            </div>
            <div className="board-footnote"><ArrowRight size={15} /><span>왼쪽 위부터 오른쪽으로, 번호 순서대로 진행해요.</span></div>
            <div className={cn('mix-progress', mixing && 'is-active')} aria-hidden="true"><span key={draw.round} /></div>
          </section>

          <aside className="sidebar" aria-label="추첨 설정과 안내">
            <Card className="settings-card"><CardContent className="settings-content">
              <div className="settings-title"><span className="small-icon"><Users size={18} /></span><h2>추첨 설정</h2></div>
              <div className="count-label"><label htmlFor="group-count">참여하는 조</label><span>최대 {MAX_GROUP_COUNT}개</span></div>
              <div className="count-control">
                <Button variant="ghost" size="icon" aria-label="조 개수 줄이기" disabled={mixing || draw.count <= MIN_GROUP_COUNT} onClick={() => changeCount(-1)}><Minus size={18} /></Button>
                <div className="count-value"><Input id="group-count" data-testid="group-count" type="number" inputMode="numeric" min={MIN_GROUP_COUNT} max={MAX_GROUP_COUNT} step={1} value={countInput} onChange={e => updateCount(e.target.value)} onBlur={commitCount} onKeyDown={e => { if (e.key === 'Enter') { commitCount(); e.currentTarget.blur() } }} disabled={mixing} aria-describedby="count-help" aria-invalid={!validCount} /><span>개 조</span></div>
                <Button variant="ghost" size="icon" aria-label="조 개수 늘리기" disabled={mixing || draw.count >= MAX_GROUP_COUNT} onClick={() => changeCount(1)}><Plus size={18} /></Button>
              </div>
              <p id="count-help" className={cn('count-help', !validCount && 'input-error')}>{validCount ? '조 개수를 바꾸면 추첨이 초기화돼요.' : `${MIN_GROUP_COUNT}~${MAX_GROUP_COUNT} 사이의 정수를 입력해 주세요.`}</p>
              <div className="settings-divider" />
              <div className="draw-info"><span>섞는 시간</span><span className="time-value"><span className="time-dot" />3초</span></div>
              <div className="action-buttons">
                <Button data-testid="shuffle-button" className="shuffle-button" disabled={mixing || !validCount} onClick={startShuffle}>{mixing ? <LoaderCircle className="animate-spin" size={18} /> : <Shuffle size={18} />}{mixing ? `섞는 중 · ${draw.secondsLeft}초` : ready ? '섞기' : '다시 섞기'}{!mixing && <ArrowRight className="button-arrow" size={17} />}</Button>
                <Button data-testid="reveal-all-button" variant="outline" className="reveal-button" disabled={draw.phase !== 'hidden'} onClick={draw.revealAll}><Eye size={18} />전체 공개</Button>
              </div>
              <p className="action-hint">{ready ? '준비가 됐다면, 행운에 맡겨볼까요?' : mixing ? '공평한 순서를 정하고 있어요.' : complete ? '다시 섞어 새로운 순서도 정할 수 있어요.' : '카드를 눌러 하나씩 열어도 좋아요.'}</p>
            </CardContent></Card>
            {complete ? <div className="result-card"><div className="result-title"><CheckCheck size={17} /><h3>오늘의 순서</h3></div><ol className="result-list">{draw.groups.map((group, index) => <li key={group}><span>{index + 1}</span><strong>{group}조</strong>{index === 0 && <Badge variant="secondary">첫 번째!</Badge>}</li>)}</ol><Button variant="outline" className="copy-button" onClick={copyResult}>{copyState === 'copied' ? <Check size={15} /> : <Copy size={15} />}{copyState === 'copied' ? '복사했어요' : '결과 복사'}</Button><span role="status" className={copyState === 'error' ? 'copy-error' : 'sr-only'}>{copyState === 'error' ? '복사하지 못했어요. 위 순서를 직접 확인해 주세요.' : copyState === 'copied' ? '결과를 클립보드에 복사했어요.' : ''}</span></div> : <div className="tip-card"><span className="tip-icon"><Clover size={22} strokeWidth={1.6} /></span><h3>결과를 여는 재미도 함께</h3><p>하나씩 열어 긴장감을 더하거나,<br />전체 공개로 시원하게 확인해요.</p><span className="tip-caption">어떤 순서든, 좋은 시작이 되길!</span></div>}
          </aside>
        </div>

        <section className="how-it-works" aria-label="세 단계 사용 안내">{steps.map((step, i) => <div className="how-step" key={step.title}><span className="step-number">0{i + 1}</span><div><h3>{['조 개수 정하기', '3초 동안 섞기', '원하는 방식으로 공개'][i]}</h3><p>{['함께할 조가 몇 개인가요?', '순서는 행운에 맡겨요.', '하나씩 또는 한 번에 확인해요.'][i]}</p></div>{i < 2 && <ArrowDown className="step-arrow" size={17} />}</div>)}</section>
      </main>
      {!ready && <div className="mobile-actions" aria-label="빠른 추첨 조작"><Button variant="outline" disabled={mixing} onClick={startShuffle}><Shuffle size={16} />{mixing ? `섞는 중 · ${draw.secondsLeft}초` : '다시 섞기'}</Button><Button disabled={draw.phase !== 'hidden'} onClick={draw.revealAll}><Eye size={16} />{complete ? '공개 완료' : '전체 공개'}</Button></div>}
      <footer className="site-footer"><span>순서뽑기<span className="brand-dot">.</span> <span className="footer-message">모든 시작에 공평한 기회를.</span></span><span className="fairness-note"><ShieldCheck size={14} />중복 없이, 공평하게</span></footer>
    </div>
  )
}

export default App
