import { Entity, PrimaryColumn, Column } from 'typeorm'

@Entity()
export class Indexer {
  @PrimaryColumn({ unique: true })
  id: number = 0

  @Column()
  block: number = 0
}
