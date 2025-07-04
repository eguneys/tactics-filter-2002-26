import wasm_url from '../../assets/wasm/hopefox.wasm?url'
import { batch, createComputed, createEffect, createMemo, createSelector, createSignal, For, mapArray, on, Show } from "solid-js"
import './Show.scss'
import { puzzle_all_tags, yn_filter, type Puzzle } from "../../worker/puzzles"
import { non_passive_on_wheel, PlayUciBoard } from "../../components/PlayUciBoard"
import { type Color } from "chessops"
import { INITIAL_FEN } from "chessops/fen"
import { makePersisted } from "@solid-primitives/storage"
import { createStore } from "solid-js/store"
import { createReplayTreeComputed, find_at_path, ReplayTreeComponent, type ModelReplayTree, type ModelStepsTree, type ModelTreeStepNode } from "../../components/ReplayTreeComponent"
import { make_steps_from_ucis, type FEN, type Path, type SAN, type UCI } from "../../components/step_types"
import { makePersistedNamespaced } from "../../components/persisted"
import { createAsync } from "@solidjs/router"
import { mor_nogen, mor_nogen_find_san, PositionManager, set_m } from "hopefox"
import { useWorker } from '../../worker/Worker2'
import { PuzzleMemo } from './throw_later'

export default function Tactics() {


    //const [{tactics}] = useStore()
    //const a_hundred = createMemo(() => tactics.a_hundred)

    const ww = useWorker()

    const a_hundred = createMemo(() => ww.puzzles ?? [])


    const [p_store, set_p_store] = makePersisted(createStore({
        filter1: '',
        filter2: '',
        puzzle_id: ''
    }))

    const f_filter1 = createMemo(()=> yn_filter(p_store.filter1))
    const f_filter2 = createMemo(()=> yn_filter(p_store.filter2))

    const filtered_tactics = createMemo(() => 
        a_hundred().filter(f_filter1()).filter(f_filter2())
    )

    const selected_puzzle = createMemo(() => filtered_tactics().find(_ => _.id === p_store.puzzle_id) ?? filtered_tactics()[0])

    const on_goto_path = (path?: Path) => {
      if (path === undefined) {
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
  const last_move = () => {
    let c  = find_at_path(replay_tree.steps_tree, replay_tree.cursor_path)

    if (c) {
      return [c.step.uci, c.step.san] as [UCI, SAN]
    }
  }


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
      set_p_store('puzzle_id', puzzle.id)
  }

  const set_cursor_path = () => {
    set_replay_tree('cursor_path', '')

    setTimeout(() => {
      // console.log('going path', c_props.get_next_path)
      goto_path_if_can(c_props.get_next_path)
    }, 200)
  }
  //set_cursor_path()

  createComputed(on(selected_puzzle, set_cursor_path))

  const on_copy_fen = () => {
    navigator.clipboard.writeText(fen())
  }
  const on_copy_id = () => {
    let id = selected_puzzle()?.id
    if (!id) {
      return
    }
    navigator.clipboard.writeText(id)
  }

  const set_filter_1 = (value: string) => {
    batch(() => {
      //set_replay_tree('cursor_path', '')
      set_p_store('filter1', value)
    })
  }
  const set_filter_2 = (value: string) => {
    batch(() => {
      //set_replay_tree('cursor_path', '')
      set_p_store('filter2', value)
    })
  }

  const on_skip_id = () => {
    set_filter_2(p_store.filter2 + ' id_' + selected_puzzle().id)
  }

  const [set_copy_rules, request_copy_rules] = createSignal(undefined, { equals: false })

  const copy_rules = () => {
    request_copy_rules()
  }

  return (
    <>
    <main class='tactics-filter'>
      <div class='code-wrap'>
          <Codebox fen={fen()} on_reset_cursor_path={() => {}} set_copy_rules={set_copy_rules}/>
      </div>
      <div class='list-wrap'>
        <div class='filter'>
            <input value={p_store.filter1} spellcheck={false} onInput={_ => set_filter_1(_.target.value)} type='text' placeholder="Filter1: y_filter _!_ n_filter"></input>
            <input value={p_store.filter2} spellcheck={false} onInput={_ => set_filter_2(_.target.value)} type='text' placeholder="Filter2: y_filter _!_ n_filter"></input>
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
        <div class='tools'>
          <button onClick={on_copy_fen}>Copy FEN</button>
          <button onClick={on_copy_id}>Copy Puzzle ID</button>
          <button onClick={on_skip_id}>Skip ID</button>
          <button onClick={copy_rules}>Copy All Rules</button>
        </div>
        <ReplayTreeComponent handle_goto_path={on_goto_path} lose_focus={true} replay_tree={replay_tree}/>
      </div>

        <Progress />
    </main>
    </>
  )
}


const Progress = () => {

  const ww = useWorker()


  return (<>
    <Show when={ww.progress}>{progress =>
      <div class='progress'> {progress()[0]}/{progress()[1]} </div>
    }</Show>
  </>
  )
}


function Codebox(props: { fen?: FEN, on_reset_cursor_path: () => void, set_copy_rules: () => void}) {

  let ww = useWorker()
  const filtered = createMemo(mapArray(() => ww.all, PuzzleMemo.create))

  const nb_failed = (name: string) => {
    return filtered().filter(_ => _.all_tags[`failed_${name}`]).length
  }
  const nb_solved = (name: string) => {
    return filtered().filter(_ => _.all_tags[`solved_${name}`]).length
  }


  createEffect(on(props.set_copy_rules, () => {

    let res = rule_list().map(_ => _.rule).join('\n\n')

    navigator.clipboard.writeText(res)
  }, { defer: true}))

  function new_rule() {
    let i = 1
    let name = `rule${i}`
    let l = rule_list()

    while (l.find(_ => _.name === name)) {
      name = `rule${i++}`
    }

    return { name, rule: '', z: l.length }
  }

  const [rule_list, set_rule_list] = makePersistedNamespaced([{name: 'rule1', rule: '', z: 0}], 'rule-list')

  const [i_rule_list, set_i_rule_list] = createSignal(0)

  ww.rules(rule_list())

  const selected_rule = createMemo(() => rule_list()[i_rule_list()])


  const on_set_rules = (e: KeyboardEvent) => {

    if (e.key === 'Escape') {
      let rule = (e.target as HTMLTextAreaElement).value
      let ss = selected_rule()
      let updated = { name: ss.name, rule, z: ss.z }

      let l = rule_list()
      let i = l.findIndex(_ => _.name === ss.name)
      l.splice(i, 1, updated)
      set_rule_list([...l])

      props.on_reset_cursor_path()
      ww.rules([updated])
    }
  }


  const add_new_rule = () => {
    batch(() => {
      set_rule_list([new_rule(), ...rule_list()])
      set_i_rule_list(0)
    })
  }

  const delete_rule = () => {
    let l = rule_list()
    if (l.length === 1) {
      return
    }
    let dd = l.splice(i_rule_list(), 1)
    batch(() => {
      set_rule_list([...l])
      if (i_rule_list() === l.length) {
        set_i_rule_list(l.length - 1)
      }
    })
    ww.rules(dd.map(_ => ({name: _.name, rule: '', z: -1})))
  }

  let get_m = createAsync<PositionManager>(() => PositionManager.make(() => wasm_url))

  let found_san = createMemo(() => { 
    const m = get_m()
    let rule = selected_rule().rule
    if (!props.fen) {
      return undefined
    }
    if (!m) {
      return undefined
    }
    set_m(m)
    try {
      return mor_nogen_find_san(rule, props.fen)
    } catch(e) {   
      return `${e}`
    }
  })

  const ascii_san = createMemo(() => {
    let rule = selected_rule()
    if (!rule || !rule.rule || !props.fen) {
      return
    }
    let m = get_m()
    if (!m) {
      return
    }

    set_m(m)
    try {
      return mor_nogen(rule.rule, props.fen)
    } catch (e) {
      return `${e}`
    }
  })

  return (<>
  <div class='codebox'>
    <div class='rule-list'>
      <div class='scroll-wrap'>
        <For each={rule_list()}>{(rule, i) =>
          <div onClick={() => set_i_rule_list(i())} class={'rule' + (i() === i_rule_list() ? ' active' : '')}>
            <span class='name'>{rule.name}</span>
            <span class='stats'>f {nb_failed(rule.name)} / s {nb_solved(rule.name)}</span>
          </div>
        }</For>
      </div>
      <div class='tools'>
        <div onClick={add_new_rule} class='rule'>+ New rule</div>
        <div onClick={delete_rule} class='rule'>- Delete rule</div>
      </div>
    </div>

    <div class='text-wrap'>
      <textarea class='editor-input' onKeyDown={on_set_rules} title='rules' rows={13} cols={21} value={selected_rule()?.rule ?? 'Select a rule'} />
      <div class='ascii'>
        <textarea disabled={true}>{ascii_san()}</textarea>

        <Show when={found_san()}>{ found_san => <span>{found_san()}</span>}</Show>
      </div>
    </div>
    </div>
  </>)
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
        <For each={Object.keys(puzzle_all_tags(puzzle))}>{ tag => 
          <span class='tag'>{tag}</span>
        }</For>
        </div>
      </div>
    }</For>
    </div>
  </div>
  </>)
}

