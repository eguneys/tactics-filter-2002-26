import wasm_url from '../assets/wasm/hopefox.wasm?url'
import { parse_puzzles, type Puzzle, type Rule, solve_p, yn_filter } from "./puzzles"
import tenk from '../assets/tenk_puzzle.csv?raw'
//import a_hundred from './assets/a_hundred_puzzles.csv?raw'
import { PositionManager, set_m } from "hopefox"
import { fen_turn } from '../components/step_types'

let all: Puzzle[] = []


const fetch_puzzles = async () => parse_puzzles(tenk)
const init = async () => {
    let m = await PositionManager.make(() => wasm_url)
    set_m(m)
    all = await fetch_puzzles()
    postMessage('ready')
}
init()



onmessage = (e) => {
    switch (e.data.t) {
        case 'filter': {
            let {filter, rules} = e.data.d
            set_filter(filter)
            set_rules(rules)
            send_work()
        } break
    }
}

let filter: string| undefined = undefined
let rules: Rule[] = []

function set_filter(f: string) {
    filter = f
}

const set_rules = (r: Rule[]) => {
    let xx = r.filter(_ => _.rule.length > 0)
    rules = [
        ...rules.filter(e => !r.find(_ => _.name === e.name)),
        ...xx
    ]

    rules.sort((a, b) => b.z - a.z)
}


function send_work() {
    postMessage(work_while_checking())
}

const double_solution = ['013ze', '05cho']

let excluded_ids = [
   '01lp3','01nIi','01tcI','01xk5','021YZ','022HT','024jR','029o2','02Aqe','02CJh','02EdZ','02JpW','02NlV',
]

function work_while_checking() {

    let puzzles = all

    //puzzles = puzzles.slice(0, 10000)
    //puzzles = puzzles.filter(_ => _.sans[0].includes('B'))
    //puzzles = puzzles.filter(_ => !_.tags['mate'] && !_.tags['endgame'])
    //puzzles = puzzles.filter(_ => !_.tags['pin'] && !_.tags['fork'] && !_.tags['trappedPiece'] && !_.tags['hangingPiece'])
    //puzzles = puzzles.filter(_ => _.id === '063RU')
    puzzles = puzzles.filter(_ => !double_solution.includes(_.id))
    //puzzles = puzzles.filter(_ => _.tags['mate'])

    puzzles = puzzles.filter(_ => !_.tags['endgame'] && !_.tags['promotion'] && !_.tags['advancedPawn'])

    puzzles = puzzles.filter(_ => !['0050w', '006wz', '00Ahb'].includes(_.id))
    puzzles = puzzles.filter(_ => !['00Rlv', '00VJF', '00WcO', '00WiB'].includes(_.id))
    puzzles = puzzles.filter(_ => !['00YeV', '00bXU', '00cW9', '00eix', '00jmi', '00km1'].includes(_.id))
    puzzles = puzzles.filter(_ => !['00pYK', '00s9L'].includes(_.id))
    puzzles = puzzles.filter(_ => !['00t8q', '00xmm', '00z3O', '012QY', '0198I'].includes(_.id))
    puzzles = puzzles.filter(_ => !['0199s', '01AHi', '01DHd','01GCT', '01J3E'].includes(_.id))
    puzzles = puzzles.filter(_ => !['01KDp', '01M18', '01NZ8', '01OAI'].includes(_.id))
    puzzles = puzzles.filter(_ => !['01UXl', '01VO2', '01Vfj'].includes(_.id))
    puzzles = puzzles.filter(_ => !excluded_ids.includes(_.id))

    puzzles = puzzles.filter(_ => fen_turn(_.fen) === 'black')
    puzzles = puzzles.slice(0, 1000)

    for (let i = 0; i < puzzles.length; i++) {
        if (i % 10 === 0) {
            send_progress([i, puzzles.length])
        }

        let puzzle = puzzles[i]
        puzzle.rules = rules.map(rule => ({ rule, solve: solve_p(puzzle, rule.rule)}))
    }

    let filtered = filter ? puzzles.filter(yn_filter(filter)) : puzzles

    send_progress()
    return { t: 'puzzles', d: { all, filtered }}
}


function send_progress(it?: [number, number]) {
    postMessage({ t: 'progress', d: it})
}