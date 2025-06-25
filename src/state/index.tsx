import { createContext, useContext, type JSX } from "solid-js";
import { createStore } from "solid-js/store";
import { create_tactics, type TacticsActions, type TacticsState } from "./create_tactics";

type Actions = TacticsActions

type State = {
    tactics: TacticsState
}

type Store = [State, Actions]

export function StoreProvider(props: { children: JSX.Element}) {

    let [tactics_state, tactics_actions] = create_tactics()

    let [state, _set_state] = createStore<State>({
        tactics: tactics_state
    })

    let actions = {
        ...tactics_actions,
    }

    let store: Store = [state, actions]


    return (<StoreContext.Provider value={store}>
        {props.children}
    </StoreContext.Provider>)

}

const StoreContext = createContext<Store>()

export function useStore() {
    return useContext(StoreContext)!
}