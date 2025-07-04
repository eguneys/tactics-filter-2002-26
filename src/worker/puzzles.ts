import { Chess, LRUCache, parseUci } from "hopefox"
import { makeFen, parseFen } from "hopefox/fen"
import { makeSan } from "hopefox/san"
import { mor_nogen_find_san } from 'hopefox'


export function parse_puzzles(str: string): Puzzle[] {
    return str.trim().split('\n').map(_ => {
        let [id, fen, moves, rating, _b, _c, _d, _tags] = _.split(',')

        let sans: string[] = []
        let move_fens: string[] = []

        let pos = Chess.fromSetup(parseFen(fen).unwrap()).unwrap()

        moves.split(' ').forEach((uci, i) => {
            let move = parseUci(uci)!
            if (i > 0) sans.push(makeSan(pos, move))
            pos.play(move)

            move_fens.push(makeFen(pos.toSetup()))
        })

        let link = `https://lichess.org/training/${id}`

        let has_tags: Record<string, true> = {}
        let has_pattern: Record<string, true> = {}

        let tags: Record<string, true> = {}
        _tags.split(' ').forEach(_ => tags[_] = true)

        return {
            rules: [],
            id, link, fen, moves, tags, rating: parseInt(rating), move_fens, sans, has_tags, has_pattern, solve: { i: undefined }
        }
    })
}

export type Puzzle = {
  id: string,
  link: string,
  fen: string,
  moves: string,
  sans: string[],
  move_fens: string[],
  rating: number,
  tags: Record<string, true>,
  has_tags: Record<string, true>,
  has_pattern: Record<string, true>,
  rules: RuleSolve[]
}

export type RuleSolve = {
  rule: Rule,
  solve: number | undefined 
}

export type Rule = { name: string, rule: string, z: number }

export type Pattern = { name: string, pattern: string }

export const puzzle_has_tags = (puzzle: Puzzle): Record<string, true> => {
  let nb_tags = Object.keys(puzzle.has_tags).length
  let res = { ... puzzle.has_tags }
  if (nb_tags > 0) {
    res.has_tag = true
    if (nb_tags === 1) {
      res.single_tag = true
    } else {
      res.many_tags = true
    }
  }
  res[`id_${puzzle.id}`] = true

  if (puzzle.rating < 1500) {
    res['easy'] = true
  } else if (puzzle.rating < 2000) {
    res['medium'] = true
  } else if (puzzle.rating < 2300) {
    res['advanced'] = true
  } else {
    res['high'] = true
  }

  return res
}

export const puzzle_all_tags = (puzzle: Puzzle): Record<string, boolean> => {
  let res = { ...puzzle.tags, ...puzzle_has_tags(puzzle) }

  if (puzzle.rules) {
    let tags = [...new Set(puzzle.rules.flatMap(rule_to_tags))]

    tags.forEach(tag => res[tag] = true)


    let tags2 = []
    let attempted = puzzle.rules.filter(_ => _.solve === undefined || _.solve >= 0)

    if (attempted.length > 0) {
      let first = attempted[0]
      if (first.solve === undefined) {
        tags2.push('matched')
        tags2.push(`matched_${first.rule.name}`)
      } else {
        tags2.push('unmatched')
      }
    }

    tags2.forEach(tag => res[tag] = true)

    if (attempted.length === 1) {
      res['single_attempt'] = true
    }
  }

  return res
}

const rule_to_tags = (rule: RuleSolve) => {
  if (rule.solve === undefined) {
    if (rule.rule.rule.includes('.')) {
      //return [`solved_${rule.rule.name}`]

    }
    return ['solved', `solved_${rule.rule.name}`]
  } else if (rule.solve >= 0) {
    return ['failed', `failed_${rule.rule.name}`]
  } else {
    return ['']
  }
}



const lruCache = new LRUCache<string>(200000); // Set a capacity

function cache_san(fen: string, rule: string) {
    const key = `${fen}${rule}`;

    const cachedValue = lruCache.get(key);
    if (cachedValue !== undefined) {
      if (cachedValue === '--') {
        return undefined
      }
        return cachedValue;
    }

    try {
      const result = mor_nogen_find_san(rule, fen);
      if (result === undefined) {
        lruCache.put(key, '--')
      } else {
        lruCache.put(key, result);
      }
      return result;
    } catch {
      return undefined
    }
}

export function solve_p(p: Puzzle, rule: string) {
    for (let i = 0; i < p.move_fens.length; i += 2) {
        let fen = p.move_fens[i]
        //let san = p.sans[i]
        let sans = p.sans.slice(i)
        if (i > 1) {
          return undefined
        }
      //let solved_san = find_san7(fen, rule)
      let solved_san = cache_san(fen, rule)
      if (p.id === '0000D') {
        //console.log(solved_san, 'XX', sans[0])
      }
      if (solved_san === undefined) {
        return -1
      }
      if (solved_san.split(' ')[0] !== sans[0]) {
        return i
      } else {
      }

    }
    return undefined
}


export const yn_filter = (filter: string) => {
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
