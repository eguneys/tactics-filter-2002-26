import { Chess, makeUci, opposite, parseUci, Position } from "chessops"
import { INITIAL_FEN, makeFen, parseFen } from "chessops/fen"
import { makeSan, parseSan } from "chessops/san"

export type FEN = string
export type UCI = string
export type SAN = string
export type Ply = number
export type Path = string
export type NAG = number

export type Step = {
    path: Path
    ply: Ply
    before_fen: FEN
    fen: FEN
    before_uci?: UCI
    uci: UCI
    san: SAN
}

export const parent_path = (path: Path) => path.split(' ').slice(0, -1).join(' ')

export const fen_pos = (fen: FEN) => Chess.fromSetup(parseFen(fen).unwrap()).unwrap()
export const fen_is_end = (fen: FEN) => fen_pos(fen).isEnd()
export const fen_turn = (fen: FEN) => fen_pos(fen).turn
export const fen_after_uci = (fen: FEN, uci: UCI) => {
    let pos = fen_pos(fen)
    pos.play(parseUci(uci)!)
    return makeFen(pos.toSetup())
}
export const fen_winner = (fen: FEN) => fen_pos(fen).isCheckmate() ? opposite(fen_turn(fen)) : undefined
export const fen_is_over_40 = (fen: FEN) => { return fen_pos(fen).fullmoves > 40 } 

export function make_steps_from_ucis(ucis: UCI[], initial_fen = INITIAL_FEN) {

    let res: Step[] = []
    let pos = fen_pos(initial_fen)

    let step0: Step | undefined
    for (let uci of ucis) {
        let move = parseUci(uci)!

        let san = makeSan(pos, move)

        pos.play(move)

        let fen = makeFen(pos.toSetup())

        let path: Path = step0 ? `${step0.path} ${uci}` : `${uci}`
        let ply: number = step0 ? (step0.ply + 1) : 1
        let before_fen: FEN = step0?.fen ?? initial_fen
        let before_uci: UCI | undefined = step0?.uci 

        step0 = {
            path,
            ply,
            before_fen,
            fen,
            before_uci,
            uci,
            san,
        }
        res.push(step0)
    }

    return res
}

export function initial_step_play_san(san: SAN, initial_fen = INITIAL_FEN): Step {
    let pos = fen_pos(initial_fen)

    let move = parseSan(pos, san)!

    let uci = makeUci(move)

    pos.play(move)

    let fen = makeFen(pos.toSetup())

    let path = `${uci}`
    let ply = 1
    let before_fen = initial_fen
    let before_uci = undefined

    return {
        path,
        ply,
        before_fen,
        fen,
        before_uci,
        uci,
        san,
    }
}

export function next_step_play_san(step: Step, san: SAN): Step {
    let pos = fen_pos(step.fen)

    let move = parseSan(pos, san)!

    let uci = makeUci(move)

    pos.play(move)

    let fen = makeFen(pos.toSetup())

    let path = `${step.path} ${uci}`
    let ply = step.ply + 1
    let before_fen = step.fen
    let before_uci = step.uci

    return {
        path,
        ply,
        before_fen,
        fen,
        before_uci,
        uci,
        san,
    }

}

 function make_step_and_play(ply: Ply, pos: Position, san: SAN, path: Path, before_uci?: UCI): Step {
    let move = parseSan(pos, san)!
    let uci = makeUci(move)

    let before_fen = makeFen(pos.toSetup())

    pos.play(move)

    let fen = makeFen(pos.toSetup())

    return {
        path,
        ply,
        before_fen,
        fen,
        before_uci,
        uci,
        san,
    }
}

type StepsSingle = Step[]

export function push_san(san: SAN, res: StepsSingle, pos?: Position) {
    let last = res[res.length - 1]
    if (!pos) {
        pos = Chess.fromSetup(parseFen(last?.fen ?? INITIAL_FEN).unwrap()).unwrap()
    }
    let path = last ? [last.path, last.uci].join(' ') : ''
    return [...res, make_step_and_play((last?.ply ?? 0) + 1, pos, san, path, last?.uci)]
}

export function build_steps(sans: SAN[], fen: FEN = INITIAL_FEN): StepsSingle {
    let res: StepsSingle = []

    let pos = Chess.fromSetup(parseFen(fen).unwrap()).unwrap()
    for (let san of sans) {
        res = push_san(san, res, pos)
    }

    return res
}


export const GLYPHS = ['!!', '!', '!?', '?!', '?', '??']
export const GLYPH_NAMES = ['brilliant', 'good', 'interesting', 'inaccuracy', 'mistake', 'blunder']

export type GLYPH = typeof GLYPHS[number]

export function glyph_to_nag(glyph: GLYPH) {
    switch (glyph) {
        case "!": return 1
        case "?": return 2
        case "!!": return 3
        case "??": return 4
        case "!?": return 5
        case "?!": return 6
    }
    return 0
}

export function nag_to_glyph(nag: NAG) {

    switch (nag) {
        case 1: return '!'
        case 2: return '?'
        case 3: return '!!'
        case 4: return '??'
        case 5: return '!?'
        case 6: return '?!'
    }
    return ''
}