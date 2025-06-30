import { createStore } from "solid-js/store"
import { type Puzzle } from "../worker/puzzles"
import { createAsync } from "@solidjs/router"
import { useWorker } from "../worker/Worker2"

export type TacticsState = {
    a_hundred: Puzzle[]
}

export type TacticsActions = {
}


export function create_tactics(): [TacticsState, TacticsActions] {

    let ww = useWorker()

    let a_hundred = createAsync(async () => ww.all ?? [], { initialValue: [] })

    let [state, _set_state] = createStore<TacticsState>({
        get a_hundred() {
            return a_hundred()
        }
    })

    let actions = {
    }

    return [state, actions]
}