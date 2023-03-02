/* global describe it before ethers */
const hardhat = require('hardhat')
const { expect } = require('chai')
import { gBefore } from '../utils/hooks.test'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { BigNumber } from 'ethers'
import { mintSigners20 } from '../utils/token'
import {
  validateMint,
  BN_ZERO,
  validateSwap,
  validateBurn,
  PoolState,
} from '../utils/contracts/rangepool'

// TODO: ✔ pool - Should handle partial mint (479ms)
// position before liquidity: BigNumber { _hex: '0x00', _isBigNumber: true }
//     1) pool - Should handle partial range cross w/ unfilled amount
/// ^this causes infinite tick loop

alice: SignerWithAddress
describe('RangePool Tests', function () {
  let tokenAmount: BigNumber
  let token0Decimals: number
  let token1Decimals: number
  let minPrice: BigNumber
  let maxPrice: BigNumber

  let alice: SignerWithAddress
  let bob: SignerWithAddress
  let carol: SignerWithAddress

  const liquidityAmount = BigNumber.from('49902591570441687020675')
  const minTickIdx = BigNumber.from('-887272')
  const maxTickIdx = BigNumber.from('887272')

  //every test should clear out all liquidity

  before(async function () {
    await gBefore()
    let currentBlock = await ethers.provider.getBlockNumber()
    //TODO: maybe just have one view function that grabs all these
    //TODO: map it to an interface
    const pool: PoolState = await hre.props.rangePool.poolState()
    const liquidity = pool.liquidity
    const feeGrowthGlobal0 = pool.feeGrowthGlobal0
    const feeGrowthGlobal1 = pool.feeGrowthGlobal1
    const price = pool.price
    const nearestTick = pool.nearestTick

    expect(liquidity).to.be.equal(BN_ZERO)

    minPrice = BigNumber.from('4295128739')
    maxPrice = BigNumber.from('1461446703485210103287273052203988822378723970341')
    token0Decimals = await hre.props.token0.decimals()
    token1Decimals = await hre.props.token1.decimals()
    tokenAmount = ethers.utils.parseUnits('100', token0Decimals)
    tokenAmount = ethers.utils.parseUnits('100', token1Decimals)
    alice = hre.props.alice
    bob = hre.props.bob
    carol = hre.props.carol
  })

  this.beforeEach(async function () {
    await mintSigners20(hre.props.token0, tokenAmount.mul(10), [hre.props.alice, hre.props.bob])

    await mintSigners20(hre.props.token1, tokenAmount.mul(10), [hre.props.alice, hre.props.bob])
  })

  it('pool1 - Should swap with zero output', async function () {

    await validateMint({
      signer: hre.props.alice,
      recipient: hre.props.alice.address,
      lowerOld: '-887272',
      lower: '20',
      upper: '60',
      upperOld: '887272',
      amount0: tokenAmount,
      amount1: tokenAmount,
      fungible: false,
      balance0Decrease: BN_ZERO,
      balance1Decrease: tokenAmount,
      liquidityIncrease: liquidityAmount,
      revertMessage: '',
    })

    await validateSwap({
      signer: hre.props.alice,
      recipient: hre.props.alice.address,
      zeroForOne: true,
      amountIn: tokenAmount.div(10),
      sqrtPriceLimitX96: minPrice,
      balanceInDecrease: BigNumber.from('10000000000000000000'),
      balanceOutIncrease: BigNumber.from('10053127661680239327'),
      revertMessage: '',
    })

    await validateBurn({
      signer: hre.props.alice,
      lower: '20',
      upper: '40',
      liquidityAmount: liquidityAmount,
      fungible: false,
      balance0Increase: BN_ZERO,
      balance1Increase: tokenAmount.sub(1),
      revertMessage: 'NotEnoughPositionLiquidity()',
    })

    await validateBurn({
      signer: hre.props.alice,
      lower: '20',
      upper: '60',
      liquidityAmount: liquidityAmount,
      fungible: false,
      balance0Increase: BigNumber.from('9999999999999999999'),
      balance1Increase: BigNumber.from('89946872338319760673'),
      revertMessage: '',
    })
  })

  it('pool0 - Should swap with zero output', async function () {
    console.log((await hre.props.rangePool.ticks("20")).toString())
    const pool: PoolState = await hre.props.rangePool.poolState()
    console.log(pool.price.toString())
    await validateMint({
      signer: hre.props.alice,
      recipient: hre.props.alice.address,
      lowerOld: '-887272',
      lower: '20',
      upper: '60',
      upperOld: '887272',
      amount0: tokenAmount,
      amount1: BN_ZERO,
      fungible: false,
      balance0Decrease: BigNumber.from('100000000000000000000'),
      balance1Decrease: BigNumber.from('0'),
      liquidityIncrease: BigNumber.from('50102591670431696268925'),
      revertMessage: '',
      collectRevertMessage: ''
    })
    console.log((await hre.props.rangePool.ticks("20")).toString())
    await validateSwap({
      signer: hre.props.alice,
      recipient: hre.props.alice.address,
      zeroForOne: false,
      amountIn: tokenAmount.div(10),
      sqrtPriceLimitX96: maxPrice,
      balanceInDecrease: BigNumber.from('10000000000000000000'),
      balanceOutIncrease: BigNumber.from('9973043433352095283'),
      revertMessage: '',
    })

    await validateBurn({
      signer: hre.props.alice,
      lower: '20',
      upper: '60',
      liquidityAmount: BigNumber.from('50102591670431696268925'),
      fungible: false,
      balance0Increase: BigNumber.from('90026956566647904717'),
      balance1Increase: BigNumber.from('9999999999999999999'),
      revertMessage: '',
    })
  })
})
