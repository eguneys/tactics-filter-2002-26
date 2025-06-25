import { createMemo, createSelector, createSignal, For } from "solid-js"
import { useStore } from "../../state"
import './Show.scss'
import { yn_filter, type Puzzle } from "../../state/puzzles"
import { PlayUciBoard } from "../../components/PlayUciBoard"
import type { Color } from "chessops"
import { INITIAL_FEN } from "chessops/fen"

export default function Tactics() {

    const [selected_puzzle, set_selected_puzzle] = createSignal<Puzzle>()

    const color = (): Color => "white"
    const fen = () => selected_puzzle()?.fen ?? INITIAL_FEN
    const last_move = () => undefined

    const puzzle_all_tags = (puzzle: Puzzle) => {
        let res: Record<string, true> = {}
        puzzle.tags.forEach(_ => res[_] = true)
        return res
    }

    const [{tactics}] = useStore()

    const a_hundred = createMemo(() => tactics.a_hundred)
    const [filter1, set_filter1] = createSignal('')
    const [filter2, set_filter2] = createSignal('')

    const f_filter1 = createMemo(()=> yn_filter(filter1(), puzzle_all_tags))
    const f_filter2 = createMemo(()=> yn_filter(filter2(), puzzle_all_tags))

    const filtered_tactics = createMemo(() => 
        a_hundred().filter(f_filter1()).filter(f_filter2())
)

  return (
    <>
    <main class='tactics-filter'>
      <div class='list-wrap'>
        <div class='filter'>
            <input spellcheck={false} onInput={_ => set_filter1(_.target.value)} type='text' placeholder="Filter1: y_filter _!_ n_filter"></input>
            <input spellcheck={false} onInput={_ => set_filter2(_.target.value)} type='text' placeholder="Filter2: y_filter _!_ n_filter"></input>
        </div>
        <div class='stats'>
          <span>{filtered_tactics().length}/{10000} Positions</span>
        </div>
        <TacticsList tactics={filtered_tactics().slice(0, 1000)} selected_id={selected_puzzle()?.id} on_selected={set_selected_puzzle} />
      </div>
      <div class='board-wrap'>
        <PlayUciBoard color={color()} fen={fen()} last_move={last_move()}/>
      </div>
    </main>
    </>
  )
}

function TacticsList(props: { tactics: Puzzle[], selected_id: string | undefined, on_selected: (_: Puzzle) => void}) {

  const sliced = createMemo(() => props.tactics)

  const isSelected = createSelector(() => props.selected_id)

  return (<>
  <div class='tactics-list'>
    <div class='list'>
    <For each={sliced()}>{ puzzle =>
      <div classList={{active: isSelected(puzzle.id) }} class='item' onClick={() => props.on_selected(puzzle)}>
        <a class='id' href={puzzle.link} target="_blank">{puzzle.id}</a>
        <div class='tags'></div>
        <div class="tags2">
        <For each={puzzle.tags}>{ tag => 
          <span class='tag'>{tag}</span>
        }</For>
        </div>
      </div>
    }</For>
    </div>
  </div>
  </>)
}

