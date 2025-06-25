export function get_a_hundred() {
    return fetch('./a_hundred_puzzles.csv').then(_ => _.text()).then(parse_puzzles)
}

export function parse_puzzles(str: string): Puzzle[] {
    return str.trim().split('\n').map(_ => {
        let [id, fen, moves, _a, _b, _c, _d, tags] = _.split(',')

        let link = `https://lichess.org/training/${id}`

        return {
            id, link, fen, moves, tags: tags.split(' ')
        }
    })
}

export type Puzzle = {
  id: string,
  link: string,
  fen: string,
  moves: string,
  tags: string[]
}