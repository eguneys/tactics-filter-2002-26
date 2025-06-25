export function get_a_hundred() {
    //return fetch('./a_hundred_puzzles.csv').then(_ => _.text()).then(parse_puzzles)
    return fetch('./tenk_puzzle.csv').then(_ => _.text()).then(parse_puzzles)
}

export function parse_puzzles(str: string): Puzzle[] {
    return str.trim().split('\n').map(_ => {
        let [id, fen, moves, _a, _b, _c, _d, tags] = _.split(',')

        let link = `https://lichess.org/training/${id}`

        tags += ` id_${id}`

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


export const yn_filter = (filter: string, puzzle_all_tags: (_: Puzzle) => Record<string, true>) => {
  return (puzzle: Puzzle) => {
    let all_tags = puzzle_all_tags(puzzle)
    let [y,n] = filter.split('_!_').map(_ => _.trim())

    let ys = y === '' ? [] : y.split(' ')

    if (n) {

      let ns = n.split(' ')

      if (ns.find(_ => all_tags[_])) {
        return false
      }
    }

    return ys.every(y => all_tags[y])
  }

}
