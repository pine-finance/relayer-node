import { Entity, PrimaryColumn, Column } from 'typeorm'

@Entity()
export class BlockNumber {
  @PrimaryColumn({ unique: true })
  id: number = 0

  @Column()
  block: number = 0
}
