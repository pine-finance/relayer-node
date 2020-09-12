import { Entity, PrimaryColumn, Column, Index } from 'typeorm'

@Entity()
export class Orders {
  @PrimaryColumn({ unique: true })
  id: string = ''

  @Column()
  module: string = ''

  @Column()
  @Index()
  inputToken: string = ''

  @Column()
  @Index()
  outputToken: string = ''

  @Column()
  minReturn: string = ''

  @Column()
  inputAmount: string = ''

  @Column({ type: String, nullable: true })
  @Index()
  fee: string = ''

  @Column()
  @Index()
  owner: string = ''

  @Column()
  secret: string = ''

  @Column()
  witness: string = ''

  @Column()
  @Index()
  createdTxHash: string = ''

  @Column({ type: String, nullable: true })
  @Index()
  executedTxHash?: string | null = ''

  @Column({ type: String, nullable: true })
  signature?: string | null = ''
}
