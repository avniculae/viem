import { beforeAll, describe, expect, test, vi } from 'vitest'
import {
  optimismClient,
  optimismSepoliaClient,
} from '../../../../test/src/opStack.js'
import {
  publicClient,
  sepoliaClient,
  setBlockNumber,
} from '../../../../test/src/utils.js'
import { getTransactionReceipt, reset } from '../../../actions/index.js'
import { getWithdrawalStatus } from './getWithdrawalStatus.js'

// TODO(fault-proofs): convert to `publicClient` & `optimismClient` when fault proofs deployed to mainnet.
test('waiting-to-prove', async () => {
  await reset(sepoliaClient, {
    blockNumber: 5527000n,
  })

  const receipt = await getTransactionReceipt(optimismSepoliaClient, {
    hash: '0x0cb90819569b229748c16caa26c9991fb8674581824d31dc9339228bb4e77731',
  })

  const status = await getWithdrawalStatus(sepoliaClient, {
    gameLimit: 10,
    receipt,
    targetChain: optimismSepoliaClient.chain,
  })
  expect(status).toBe('waiting-to-prove')
})

test('ready-to-prove', async () => {
  await reset(sepoliaClient, {
    blockNumber: 5528129n,
  })

  const receipt = await getTransactionReceipt(optimismSepoliaClient, {
    hash: '0x0cb90819569b229748c16caa26c9991fb8674581824d31dc9339228bb4e77731',
  })

  const status = await getWithdrawalStatus(sepoliaClient, {
    gameLimit: 10,
    receipt,
    targetChain: optimismSepoliaClient.chain,
  })
  expect(status).toBe('ready-to-prove')
})

test('waiting-to-finalize', async () => {
  await reset(sepoliaClient, {
    blockNumber: 5533180n,
  })

  const receipt = await getTransactionReceipt(optimismSepoliaClient, {
    hash: '0x0cb90819569b229748c16caa26c9991fb8674581824d31dc9339228bb4e77731',
  })

  const status = await getWithdrawalStatus(sepoliaClient, {
    gameLimit: 10,
    receipt,
    targetChain: optimismSepoliaClient.chain,
  })
  expect(status).toBe('waiting-to-finalize')
})

// TODO(fault-proofs): unskip when this transaction is actually ready to finalize.
test.skip('ready-to-finalize', async () => {
  const receipt = await getTransactionReceipt(optimismSepoliaClient, {
    hash: '0x0cb90819569b229748c16caa26c9991fb8674581824d31dc9339228bb4e77731',
  })

  const status = await getWithdrawalStatus(sepoliaClient, {
    gameLimit: 10,
    receipt,
    targetChain: optimismSepoliaClient.chain,
  })
  expect(status).toBe('ready-to-finalize')
})

test('finalized', async () => {
  const receipt = await getTransactionReceipt(optimismSepoliaClient, {
    hash: '0x28199bd830b7ff4f029145cf5b961aaaf8bf53e993a9d9788eb20d7b7706e517',
  })

  const status = await getWithdrawalStatus(sepoliaClient, {
    gameLimit: 10,
    receipt,
    targetChain: optimismSepoliaClient.chain,
  })
  expect(status).toBe('finalized')
})

test('error: non-withdrawal tx', async () => {
  const receipt = await getTransactionReceipt(optimismClient, {
    hash: '0xecb1c13ee638e5cf6a0977d9ee6910fb7c5188d3dff807fd3e658d1533137023',
  })

  await expect(() =>
    getWithdrawalStatus(publicClient, {
      receipt,
      targetChain: optimismClient.chain,
    }),
  ).rejects.toThrowErrorMatchingInlineSnapshot(`
    [ReceiptContainsNoWithdrawalsError: The provided transaction receipt with hash "0xecb1c13ee638e5cf6a0977d9ee6910fb7c5188d3dff807fd3e658d1533137023" contains no withdrawals.

    Version: viem@1.0.2]
  `)
})

test('error: portal contract non-existent (old block)', async () => {
  await setBlockNumber(15772363n)
  const receipt = await getTransactionReceipt(optimismClient, {
    hash: '0x7b5cedccfaf9abe6ce3d07982f57bcb9176313b019ff0fc602a0b70342fe3147',
  })

  await expect(() =>
    getWithdrawalStatus(publicClient, {
      receipt,
      targetChain: optimismClient.chain,
    }),
  ).rejects.toThrowErrorMatchingInlineSnapshot(`
    [ContractFunctionExecutionError: The contract function "version" returned no data ("0x").

    This could be due to any of the following:
      - The contract does not have the function "version",
      - The parameters passed to the contract function may be invalid, or
      - The address is not a contract.
     
    Contract Call:
      address:   0x0000000000000000000000000000000000000000
      function:  version()

    Docs: https://viem.sh/docs/contract/readContract
    Version: viem@1.0.2]
  `)
})

describe('legacy (portal v2)', () => {
  beforeAll(async () => {
    await setBlockNumber(18772363n)
  })

  test('ready-to-prove', async () => {
    // https://optimistic.etherscan.io/tx/0x7b5cedccfaf9abe6ce3d07982f57bcb9176313b019ff0fc602a0b70342fe3147
    const receipt = await getTransactionReceipt(optimismClient, {
      hash: '0x7b5cedccfaf9abe6ce3d07982f57bcb9176313b019ff0fc602a0b70342fe3147',
    })

    const status = await getWithdrawalStatus(publicClient, {
      receipt,
      targetChain: optimismClient.chain,
    })
    expect(status).toBe('ready-to-prove')
  }, 20_000)

  test('waiting-to-prove', async () => {
    const receipt = await getTransactionReceipt(optimismClient, {
      hash: '0x7b5cedccfaf9abe6ce3d07982f57bcb9176313b019ff0fc602a0b70342fe3147',
    })

    const status = await getWithdrawalStatus(publicClient, {
      receipt: {
        ...receipt,
        blockNumber: 99999999999999n,
      },
      targetChain: optimismClient.chain,
    })
    expect(status).toBe('waiting-to-prove')
  })

  test('waiting-to-finalize', async () => {
    await setBlockNumber(18804700n)
    vi.setSystemTime(new Date(1702805347000))

    // https://etherscan.io/tx/0x281675c625ee73af6f83ae0c760c87efd312a71f406922ac9e4e467b1bf5a8bb
    // https://optimistic.etherscan.io/tx/0x8f6cb1878adad369d6fc8f6cd4f8cd0ea17d3a76e58947b93bc41ab65717da18
    const receipt = await getTransactionReceipt(optimismClient, {
      hash: '0x8f6cb1878adad369d6fc8f6cd4f8cd0ea17d3a76e58947b93bc41ab65717da18',
    })

    const status = await getWithdrawalStatus(publicClient, {
      receipt,
      targetChain: optimismClient.chain,
    })
    expect(status).toBe('waiting-to-finalize')

    vi.useRealTimers()
  }, 20_000)

  test('ready-to-finalize', async () => {
    await setBlockNumber(18803790n)
    // https://etherscan.io/tx/0xec7d0380be9c64daf725369fc3bb6ebe2b0b5ed01291661130f6322696d9f1d7
    // https://optimistic.etherscan.io/tx/0x80c06f76d42e94a6427672e99e83bc487fde29570d1cf59844cad2d43fdf2ab4
    const receipt = await getTransactionReceipt(optimismClient, {
      hash: '0x80c06f76d42e94a6427672e99e83bc487fde29570d1cf59844cad2d43fdf2ab4',
    })

    const status = await getWithdrawalStatus(publicClient, {
      receipt,
      targetChain: optimismClient.chain,
    })
    expect(status).toBe('ready-to-finalize')
  }, 20_000)
})
