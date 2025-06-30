import { puzzle_all_tags, puzzle_has_tags, type Puzzle } from "../../worker/puzzles"

export class PuzzleMemo {

  static create = (puzzle: Puzzle) => {

    return new PuzzleMemo(puzzle)
  }

  get id() {
    return this.puzzle.id
  }

  get fen() {
    return this.puzzle.fen
  }

  get tags() {
    return this.puzzle.tags
  }

  _has_tags: Record<string, boolean> | undefined
  get has_tags() {
    if (!this._has_tags) {
      this._has_tags = puzzle_has_tags(this.puzzle)
    }
    return this._has_tags
  }

  _all_tags: Record<string, boolean> | undefined
  get all_tags() {
    if (!this._all_tags) {
      this._all_tags = puzzle_all_tags(this.puzzle)
    }
    return this._all_tags
  }

  private constructor(puzzle: Puzzle) {
    this.puzzle = puzzle;
  }

  private readonly puzzle: Puzzle;
}