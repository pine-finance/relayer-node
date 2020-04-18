import { Entity, PrimaryColumn, Column, Index } from 'typeorm'

@Entity()
export class Orders {
  @PrimaryColumn({ unique: true })
  id: string = ''

  @Column()
  @Index()
  fromToken: string = ''

  @Column()
  @Index()
  toToken: string = ''

  @Column()
  minReturn: string = ''

  @Column()
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
  txHash: string = ''

  @Column({ type: String, nullable: true })
  @Index()
  executedTx?: string | null = ''
}
