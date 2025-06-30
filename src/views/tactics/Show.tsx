import { batch, createMemo, createSelector, createSignal, For } from "solid-js"
import { useStore } from "../../state"
import './Show.scss'
import { yn_filter, type Puzzle } from "../../state/puzzles"
import { non_passive_on_wheel, PlayUciBoard } from "../../components/PlayUciBoard"
import type { Color } from "chessops"
import { INITIAL_FEN } from "chessops/fen"
import { makePersisted } from "@solid-primitives/storage"
import { createStore } from "solid-js/store"
import { createReplayTreeComputed, find_at_path, ReplayTreeComponent, type ModelReplayTree, type ModelStepsTree, type ModelTreeStepNode } from "../../components/ReplayTreeComponent"
import { make_steps_from_ucis, type Path } from "../../components/step_types"

export default function Tactics() {

    const [selected_puzzle, set_selected_puzzle] = createSignal<Puzzle>()

    const puzzle_all_tags = (puzzle: Puzzle) => {
        let res: Record<string, true> = {}
        puzzle.tags.forEach(_ => res[_] = true)
        return res
    }

    const [{tactics}] = useStore()

    const a_hundred = createMemo(() => tactics.a_hundred)

    const [p_store, set_p_store] = makePersisted(createStore({
        filter1: '',
        filter2: ''
    }))

    const f_filter1 = createMemo(()=> yn_filter(p_store.filter1, puzzle_all_tags))
    const f_filter2 = createMemo(()=> yn_filter(p_store.filter2, puzzle_all_tags))

    const filtered_tactics = createMemo(() => 
        a_hundred().filter(f_filter1()).filter(f_filter2())
    )

    const on_goto_path = (path?: Path) => {
      if (!path) {
        return
      }
      set_replay_tree('cursor_path', path)
    }

    const steps = createMemo(() => {
      let p = selected_puzzle()
      if (!p) {
        return []
      }

      return make_steps_from_ucis(p.moves.split(' '), p.fen)
    })

    const flat_nodes = createMemo((): Record<Path, ModelTreeStepNode[]> => {
      let ss = steps()

      let res: Record<Path, ModelTreeStepNode[]> = {}
      let path = ''
      for (let step of ss) {
        if (!res[path]) {
          res[path] = []
        }
        res[path].push({ step })
        path = step.path
      }
      return res
    })

    const steps_tree = createMemo((): ModelStepsTree => ({
      flat_nodes: flat_nodes()
    }))
    
    const [replay_tree, set_replay_tree] = createStore<ModelReplayTree>({
        get steps_tree() { return steps_tree() } ,
        cursor_path: ''
    })


  const color = (): Color => "white"
  const fen = () => find_at_path(replay_tree.steps_tree, replay_tree.cursor_path)?.step.fen ?? selected_puzzle()?.fen ?? INITIAL_FEN
  const last_move = () => undefined


  const goto_path_if_can = (path?: Path) => {
    if (path !== undefined) {
      set_replay_tree('cursor_path', path)
    }
  }

  let c_props = createReplayTreeComputed({replay_tree})

  const set_on_wheel = (i: number) => {
    if (i > 0) {
      goto_path_if_can(c_props.get_next_path)
    } else {
      goto_path_if_can(c_props.get_prev_path)
    }
  }

  const on_selected = (puzzle: Puzzle) => {
    batch(() => {
      set_selected_puzzle(puzzle)
      set_replay_tree('cursor_path', '')
    })
  }

  return (
    <>
    <main class='tactics-filter'>
      <div class='list-wrap'>
        <div class='filter'>
            <input value={p_store.filter1} spellcheck={false} onInput={_ => set_p_store('filter1', _.target.value)} type='text' placeholder="Filter1: y_filter _!_ n_filter"></input>
            <input value={p_store.filter2} spellcheck={false} onInput={_ => set_p_store('filter2', _.target.value)} type='text' placeholder="Filter2: y_filter _!_ n_filter"></input>
        </div>
        <div class='stats'>
          <span>{filtered_tactics().length}/{10000} Positions</span>
        </div>
        <TacticsList tactics={filtered_tactics().slice(0, 1000)} selected_id={selected_puzzle()?.id} on_selected={on_selected} />
      </div>
      <div  on:wheel={non_passive_on_wheel(set_on_wheel)} class='board-wrap'>
        <PlayUciBoard color={color()} fen={fen()} last_move={last_move()}/>
      </div>
      <div class='replay-wrap'>
        <ReplayTreeComponent handle_goto_path={on_goto_path} lose_focus={false} replay_tree={replay_tree}/>
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

