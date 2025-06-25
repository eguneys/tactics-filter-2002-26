import { createStore } from "solid-js/store"
import { get_a_hundred, type Puzzle } from "./puzzles"
import { createAsync } from "@solidjs/router"

export type TacticsState = {
    a_hundred: Puzzle[]
}

export type TacticsActions = {
}


export function create_tactics(): [TacticsState, TacticsActions] {

    let a_hundred = createAsync(get_a_hundred, { initialValue: [] })

    let [state, _set_state] = createStore<TacticsState>({
        get a_hundred() {
            return a_hundred()
        }
    })

    let actions = {
    }

    return [state, actions]
}