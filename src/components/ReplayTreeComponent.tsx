import { children, createEffect, createMemo, For, type JSX, on, onCleanup, onMount, Show } from "solid-js"
import { fen_turn, parent_path } from './step_types'
import type { FEN, NAG, Path, SAN, Step, UCI } from "./step_types"
import './ReplayTreeComponent.scss'
import { INITIAL_FEN } from "chessops/fen"
import { type Color } from "chessops"
import { usePlayer } from "../sound"

export type ModelStepsTree = {
    flat_nodes: Record<Path, ModelTreeStepNode[]>
    initial_fen?: FEN
}
export type ModelTreeStepNode = {
    step: Step,
    nags?: NAG[],
    comments?: string[]
}
export type ModelReplayTree = {
    steps_tree: ModelStepsTree
    cursor_path: Path
}

export function nodes_at_and_after_path(tree: ModelStepsTree, path: Path): ModelTreeStepNode[] {
    let at = find_at_path(tree, path)
    if (!at) {
        throw new NoNodeAtPathError(path)
    }
    let children = find_children_at_path(tree, path)
    return [at, ...children.flatMap(_ => nodes_at_and_after_path(tree, _.step.path))]
}

function previous_branch_points_at_cursor_path(tree: ModelReplayTree) {
    return previous_branch_points(tree.steps_tree, tree.cursor_path)
}

function siblings_of(tree: ModelStepsTree, path: Path) {
    return find_children_at_path(tree, parent_path(path))
}
function previous_branch_points(tree: ModelStepsTree, path: Path) {
    let res = []
    let i = find_root_children(tree)

    let add_variation = i.length > 1

    if (path === '') {
        return i
    }

    for (let uci of path.split(' ')) {

        let next = i.find(_ => _.step.uci === uci)

        if (!next) {
            return undefined
        }

        if (add_variation) {
            res.push(next)
            add_variation = false
        }

        let next_children = find_children_at_path(tree, next.step.path)

        if (next_children.length > 1) {
            add_variation = true
        }
        i = next_children
    }
    return res
}

export function find_root_children(tree: ModelStepsTree) {
    return find_children_at_path(tree, '')
}

export function find_parent_and_child_at_path(tree: ModelStepsTree, path: Path): [ModelTreeStepNode | undefined, ModelTreeStepNode] | undefined {

    let child = find_at_path(tree, path)

    if (!child) {
        return undefined
    }

    let parent = find_at_path(tree, parent_path(path))
    return [parent, child]
}

export function find_at_path(tree: ModelStepsTree, path: Path) {
    if (path === '') {
        return undefined
    }

    let parent = parent_path(path)
    let nodes = tree.flat_nodes[parent]

    // FIX shouldnt happen
    if (nodes === undefined) {
        //console.log(path, parent, unwrap(tree.flat_nodes))
        //debugger
        return undefined
    }
    let child = nodes.find(_ => _.step.path === path)

    return child
}

export function find_children_at_path(tree: ModelStepsTree, path: Path) {
    return tree.flat_nodes[path] ?? []
}

export function node_length(tree: ModelStepsTree, node: ModelTreeStepNode) {

    let cc = find_children_at_path(tree, node.step.path)

    if (cc.length > 1) {
        return 1
    }
    if (cc.length === 0) {
        return 0
    }

    let res = 1
    let i = cc[0]
    while (find_children_at_path(tree, i.step.path).length === 1) {
        res++
        i = find_children_at_path(tree, i.step.path)[0]
    }
    return res
}

export function node_nb_first_variations(tree: ModelStepsTree, node: ModelTreeStepNode) {
    return node_children_first_variations(tree, node)?.length ?? 0
}

const node_children_first_variations = (tree: ModelStepsTree, node: ModelTreeStepNode) => {
    let child = node_first_child_with_variations(tree, node)
    return child ? find_children_at_path(tree, child.step.path) : undefined
}

const node_first_child_with_variations = (tree: ModelStepsTree, node: ModelTreeStepNode) => {
    let cc = find_children_at_path(tree, node.step.path)
    if (cc.length === 0) {
        return undefined
    } else if (cc.length === 1) {
        return node_first_child_with_variations(tree, cc[0])
    } else {
        return node
    }
}

export function as_pgn_for_path(tree: ModelStepsTree, path: Path) {
    return render_path(tree, find_children_at_path(tree, ''), true, path)
}



export function as_export_pgn(tree: ModelStepsTree) {
    return render_lines(tree, find_children_at_path(tree, ''), true)
}

function render_data(data: ModelTreeStepNode, show_index = false) {
    let ply = data.step.ply
    let i = (ply % 2 === 1 || show_index) ? (Math.ceil(ply / 2) + (ply % 2 === 1 ? '.' : '...')) : ''
    let tail = ply % 2 === 1 ? '' : ' '
    return `${i} ${data.step.san}${data.comments ? ' { ' + data.comments + ' }' : ''}${tail}`
}

function render_lines(tree: ModelStepsTree, ts: ModelTreeStepNode[], show_index = false) {

    let res = ''
    if (ts.length === 0) {
    } else if (ts.length === 1) {
        res += render_data(ts[0], show_index)
        res += render_lines(tree, find_children_at_path(tree, ts[0].step.path), false)
    } else {
        res += render_data(ts[0], false).trimEnd()
        res += ' ' + ts.slice(1).map(_ => `(${render_lines(tree, [_], true).trimEnd()})`).join(' ')
        res += ' ' + render_lines(tree, find_children_at_path(tree, ts[0].step.path), true)
    }
    return res
}

function render_path(tree: ModelStepsTree, ts: ModelTreeStepNode[], show_index = false, i_path: Path) {
    let res = ''
    let step = ts.find(_ => i_path.startsWith(_.step.path))
    if (!step) {
        return res
    }
    res += render_data(step, show_index)
    res += render_path(tree, find_children_at_path(tree, step.step.path), false, i_path)
    return res
}


type ReplayTreeComputed = {
    cursor_path: Path
    get_prev_path: Path | undefined
    get_next_path: Path | undefined
    get_up_path: Path | undefined
    get_down_path: Path | undefined
    get_first_path: Path | undefined
    get_last_path: Path | undefined
    step_at_cursor_path: ModelTreeStepNode | undefined,

    initial_fen: FEN
    fen: FEN
    last_move: [UCI, SAN] | undefined
    turn: Color
}

export type CursorPathEffectOption = 'hold' | 'no-last-move' | 'allow'

export function createReplayTreeComputed(props: { replay_tree: ModelReplayTree }): ReplayTreeComputed {

    const cursor_path = createMemo(() => props.replay_tree.cursor_path)

    const steps = createMemo(() => props.replay_tree.steps_tree)

    const initial_fen = createMemo(() => find_at_path(steps(), '')?.step.fen ?? steps().initial_fen ?? INITIAL_FEN)

    const fen = createMemo(() => find_at_path(steps(), cursor_path())?.step.fen ?? initial_fen())
    const last_move = createMemo(() => {
        let step = find_at_path(steps(), cursor_path())?.step
        if (!step) {
            return undefined
        }

        return [step.uci, step.san] as [UCI, SAN]
    })

    let sticky_paths: Path[] = []

    createEffect(on(cursor_path, (path: Path) => {
        previous_branch_points(steps(), path)?.map(branch => {
            if (!sticky_paths.includes(branch.step.path)) {
                siblings_of(steps(), branch.step.path)?.forEach(sibling => {
                    sticky_paths = sticky_paths
                        .filter(_ => _ !== sibling.step.path)
                })

                /*
                if (props.replay_tree.error_paths.includes(branch.step.path) || props.replay_tree.failed_path === branch.step.path) {
                    return
                }
                    */
                sticky_paths.push(branch.step.path)
            }
        })
    }))




    const get_prev_path = createMemo(() => {
        let c = cursor_path()

        if (c === '') {
            return undefined
        }

        return c.split(' ').slice(0, -1).join(' ')
    })

    const get_next_path = createMemo(() => {
        let c = cursor_path()

        let children = find_children_at_path(steps(), c)

        if (children.length === 1) {
            return children[0].step.path
        }

        return children.find(_ => sticky_paths.includes(_.step.path))?.step.path ?? children[0]?.step.path
    })

    const get_first_path = createMemo(() => {
        let pc = find_parent_and_child_at_path(steps(), cursor_path())

        if (!pc) {
            return undefined
        }

        let i = pc

        if (!i[0]) {
            return ''
        }

        if (find_children_at_path(steps(), i[0].step.path).length > 1) {
            return i[0].step.path
        }

        while (true) {
            if (!i[0]) {
                break
            }
            if (find_children_at_path(steps(), i[0].step.path).length > 1) {
                break
            }

            let _i = find_parent_and_child_at_path(steps(), i[0].step.path)

            if (!_i) {
                break
            }
            i = _i
        }
        return i[1].step.path
    })

    const get_last_path = createMemo(() => {
        let step = find_at_path(steps(), cursor_path())

        if (!step) {
            let root = find_root_children(steps())
            return (root.find(_ => sticky_paths.includes(_.step.path)) ?? root[0])?.step.path
        }

        let i = step

        let i_children = find_children_at_path(steps(), i.step.path)
        if (i_children.length > 1) {
            return i_children.find(_ => sticky_paths.includes(_.step.path))?.step.path ?? i_children[0]?.step.path
        }

        while (i_children.length === 1) {
            i = i_children[0]
            i_children = find_children_at_path(steps(), i.step.path)
        }
        return i.step.path
    })

    const get_up_path = createMemo(() => {
        let pc = find_parent_and_child_at_path(steps(), cursor_path())

        if (!pc) {
            return undefined
        }

        let cc: ModelTreeStepNode[] = pc[0] ? find_children_at_path(steps(), pc[0].step.path) : []

        if (!pc[0]) {
            cc = find_root_children(steps())
        } else if (find_children_at_path(steps(), pc[0].step.path).length === 1) {
            while (true) {
                pc = find_parent_and_child_at_path(steps(), pc[0].step.path)
                if (!pc) {

                    return undefined
                }

                if (!pc[0]) {
                    cc = find_root_children(steps())
                    break
                }

                if (find_children_at_path(steps(), pc[0].step.path).length > 1) {
                    cc = find_children_at_path(steps(), pc[0].step.path)
                    break
                }
            }
        }

        let i = cc.indexOf(pc[1])

        let c = cc[i - 1]

        if (!c) {
            return undefined
        }

        return c.step.path
    })

    const get_down_path = createMemo(() => {
        let pc = find_parent_and_child_at_path(steps(), cursor_path())

        if (!pc) {
            return undefined
        }

        let cc: ModelTreeStepNode[] = pc[0] ? find_children_at_path(steps(), pc[0].step.path) : []

        if (!pc[0]) {
            cc = find_root_children(steps())
        } else if (find_children_at_path(steps(), pc[0].step.path).length === 1) {
            while (true) {
                pc = find_parent_and_child_at_path(steps(), pc[0].step.path)
                if (!pc) {
                    return undefined
                }

                if (!pc[0]) {
                    cc = find_root_children(steps())
                    break
                }

                if (find_children_at_path(steps(), pc[0].step.path).length > 1) {
                    cc = find_children_at_path(steps(), pc[0].step.path)
                    break
                }
            }
        }

        let i = cc.indexOf(pc[1])

        let c = cc[i + 1]

        if (!c) {
            return undefined
        }

        return c.step.path
    })

    const step_at_cursor_path = createMemo(() => find_at_path(props.replay_tree.steps_tree, cursor_path()))

    return {
        get initial_fen() { return initial_fen() },
        get fen() { return fen() },
        get turn() { return fen_turn(fen()) },
        get last_move() { return last_move() },
        get step_at_cursor_path() { return step_at_cursor_path() },
        get cursor_path() { return cursor_path() },
        get get_prev_path() { return get_prev_path() },
        get get_next_path() { return get_next_path() },
        get get_first_path() { return get_first_path() },
        get get_last_path() { return get_last_path() },
        get get_down_path() { return get_down_path() },
        get get_up_path() { return get_up_path() }
    }
}

export const create_sound_effects = (props: { step_at_cursor_path: ModelTreeStepNode | undefined }) => {
    const Player = usePlayer()
    Player.setVolume(0.2)

    createEffect(on(() => props.step_at_cursor_path, (current, prev) => {
        if (current) {
            if (!prev || prev.step.ply === current.step.ply - 1) {
                Player.move(current.step)
            }
        }
    }))
}



export const ReplayTreeComponent = (props: { features?: JSX.Element, feature_content?: JSX.Element, handle_goto_path: (path?: Path) => void, replay_tree: ModelReplayTree, lose_focus: boolean, on_context_menu?: (e: MouseEvent, _: Path) => void  }) => {

    let c_props = createReplayTreeComputed(props)

    const goto_path = (path: Path) => {
        props.handle_goto_path(path)
    }
    const goto_path_if_can = (path?: Path) => {
        props.handle_goto_path(path)
    }
 
    const on_set_cursor = (path: Path) => {
        goto_path(path)
    }

    const on_context_menu = (e: MouseEvent, p: Path) => {
        props.on_context_menu?.(e, p)
    }

    let $moves_el: HTMLDivElement
        createEffect(() => {

        let cursor_path = props.replay_tree.cursor_path
        let cont = $moves_el.parentElement
        if (!cont) {
            return
        }

        const target = $moves_el.querySelector<HTMLElement>('.on-path-end')
        if (!target) {
            cont.scrollTop = cursor_path.length > 0 ? 99999 : 0
            return
        }

        let top = target.offsetTop - cont.offsetHeight / 2 + target.offsetHeight
        cont.scrollTo({ behavior: 'smooth', top })
    })

    const on_key_down = (e: KeyboardEvent) => {
        if (props.lose_focus) {
            return
        }

        let catched = false
        if (e.key === 'ArrowLeft') {
            goto_path_if_can(c_props.get_prev_path)
            catched = true
        }
        if (e.key === 'ArrowRight') {
            goto_path_if_can(c_props.get_next_path)
            catched = true
        }
        if (e.key === 'ArrowUp') {
            goto_path_if_can(c_props.get_up_path)
            catched = true
        }
        if (e.key === 'ArrowDown') {
            goto_path_if_can(c_props.get_down_path)
            catched = true
        }
        if (catched) {
            e.preventDefault()
        }
    }

    onMount(() => {

        document.addEventListener('keydown', on_key_down)

        onCleanup(() => {
            document.removeEventListener('keydown', on_key_down)
        })
    })

    const features = children(() => props.features)
    const feature_content = children(() => props.feature_content)

    return (<>
    <div class='replay-tree'>
        <div class='moves-wrap'>
            <div ref={_ => $moves_el = _} class='moves'>
                <NodesShorten replay_tree={props.replay_tree} {...c_props} on_set_cursor={on_set_cursor} on_context_menu={on_context_menu} path=""/>
            </div>
        </div>
        <Show when={feature_content()} fallback={
        <div class='branch-sums'>
            <button 
                title="up"
                class="fbt up"
                disabled={c_props.get_up_path === undefined}
                classList={{ disabled: c_props.get_up_path === undefined }}
                onClick={() => goto_path_if_can(c_props.get_up_path)}
                data-icon="" />
            <button 
                title="down"
                class="fbt down"
                disabled={c_props.get_down_path === undefined} 
                classList={{disabled: c_props.get_down_path === undefined}}
                onClick={() => goto_path_if_can(c_props.get_down_path)} 
                data-icon="" />

            <For each={previous_branch_points_at_cursor_path(props.replay_tree)}>{branch =>
                <div class='fbt' onClick={() => goto_path(branch.step.path) }>
                    <Show when={branch.step.ply & 1}>
                        <span class='index'>{ply_to_index(branch.step.ply)}</span>
                    </Show>
                    {branch.step.san}
                </div>
            }</For>
        </div>
        }>{content => content() }</Show>
        <div class='replay-jump'>
            <Show when={features()}>{ features => features() }</Show>
            <button title="first" disabled={c_props.get_first_path === undefined} 
                class="fbt first" 
                classList={{ disabled: c_props.get_first_path === undefined }}
                onClick={() => goto_path_if_can(c_props.get_first_path)} data-icon="" />
            <button title="previous" disabled={c_props.get_prev_path === undefined} 
                class="fbt prev" 
                classList={{ disabled: c_props.get_prev_path === undefined }}
                onClick={() => goto_path_if_can(c_props.get_prev_path)} data-icon="" />

            <button title="next" disabled={c_props.get_next_path === undefined} 
                class="fbt next" 
                classList={{ disabled: c_props.get_next_path === undefined }}
                onClick={() => goto_path_if_can(c_props.get_next_path)} data-icon="" />
            <button title="last" disabled={c_props.get_last_path === undefined} 
                class="fbt last" 
                classList={{ disabled: c_props.get_last_path === undefined }}
                onClick={() => goto_path_if_can(c_props.get_last_path)} data-icon="" />
        </div>
    </div>
    </>)
}


function NodesShorten(props: { path: Path, replay_tree: ModelReplayTree, on_set_cursor: (_: Path) => void, on_context_menu: (e: MouseEvent, _: Path) => void 
    cursor_path: Path,
}) {

    const nodes = createMemo(() => props.replay_tree.steps_tree.flat_nodes[props.path] ?? [])

    return (<>
    <Show when={nodes().length === 1}>
        <StepNode {...props} cursor_path={props.replay_tree.cursor_path} node={nodes()[0]}/>
        <NodesShorten {...props} path={nodes()[0].step.path}/>
    </Show>
    <Show when={nodes().length > 1}>
        <div class='lines'>
            <For each={nodes()}>{ node => 
              <div class='line'>
                <Show when={props.replay_tree.cursor_path.startsWith(node.step.path)} fallback={
                            <>
                                <StepNode {...props} cursor_path={props.replay_tree.cursor_path} node={node} show_index={true} collapsed={true} />
                                <NodesCollapsed node={node} replay_tree={props.replay_tree}/>
                            </>
                }>
                    <>
                    <StepNode {...props} cursor_path={props.replay_tree.cursor_path} node={node} show_index={true}/>
                    <NodesShorten {...props} path={node.step.path} />
                    </>
                </Show>
              </div>
            }</For>
        </div>
    </Show>
    </>)
}

function NodesCollapsed(props: { node: ModelTreeStepNode, replay_tree: ModelReplayTree }) {
    return (<>
        <span class='collapsed'>..{node_length(props.replay_tree.steps_tree, props.node)} {node_nb_first_variations(props.replay_tree.steps_tree, props.node)}</span>
    </>)
}

export function MoveContextMenuComponent(props: { step: Step, children: JSX.Element, ref: HTMLDivElement }) {

    return (<>
    <div onClick={e => { e.preventDefault(); e.stopImmediatePropagation(); }} ref={props.ref} class='context-menu'>
        <div class='title'>{ply_to_index(props.step.ply)}{props.step.san}</div>
        <div class='list'>{props.children}</div>
    </div>
    </>)
}







function StepNode(props: { node: ModelTreeStepNode, show_index?: boolean, collapsed?: boolean, on_context_menu: (e: MouseEvent, _: Path) => void,
    cursor_path: Path, on_set_cursor: (_: Path) => void,
 }) {

    const step = createMemo(() => props.node.step)
    let show_index = createMemo(() => step().ply % 2 === 1 || props.show_index)

    const path = createMemo(() => step().path)

    const on_path = createMemo(() => props.cursor_path.startsWith(path()))
    const on_path_end = createMemo(() => path() === props.cursor_path)


    const klassList = createMemo(() => ({
        collapsed: props.collapsed,
        ['on-path']: on_path(),
        ['on-path-end']: on_path_end(),
        [nag_klass[props.node.nags?.[0] ?? 0]]: props.node.nags !== undefined
    }))

    return (<>
    <div 
    
    class="move"
    classList={klassList()}
    onContextMenu={(e) => { e.preventDefault(); props.on_context_menu(e, step().path) }} 
    onClick={() => { props.on_set_cursor(step().path) } }>
        <Show when={show_index()}><span class='index'>{ply_to_index(step().ply)}</span></Show>
        {step().san}
            <Show when={props.node.nags}>{nags =>
                <Nags nags={nags()} />
            }</Show>
    </div>
    </>)
}

export let text = ['', '!', '?', '!!', '??', '!?', '?!']
text[22] = '⨀'

let nag_klass = ['', 'good', 'mistake', 'top', 'blunder', 'interesting', 'inaccuracy']

const Nags = (props: { nags: number[] }) => {
  return (<> <span class='nag'>{text[props.nags[0]]}</span> </>)
}



export const ply_to_index = (ply: number) => {
    let res = Math.ceil(ply / 2)
    return `${res}.` + (ply % 2 === 0 ? '..' : '')
}

class NoNodeAtPathError extends Error {
    constructor(path: Path) {
        super(path)
    }
}