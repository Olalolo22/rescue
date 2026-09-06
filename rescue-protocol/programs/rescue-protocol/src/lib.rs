use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod math;
pub mod state;

pub use errors::*;
pub use instructions::*;
pub use math::*;
pub use state::*;

declare_id!("GCcUbgthDu323rfq9Z3iWNFR632wXWMZ66KKtdTtxDBT");

#[program]
pub mod rescue_protocol {
    use super::*;

    /// Initialize global governance parameters (RescueConfigPDA).
    pub fn init_config(
        ctx: Context<InitConfig>,
        reserve_spread_bps: u16,
        bond_pct_bps: u16,
        min_bond_amount: u64,
        max_drift_bps: u16,
        rescue_window_slots: u64,
        settlement_window_slots: u64,
        runner_up_window_slots: u64,
        target_hf_bps: u32,
        cooldown_slots: u64,
        liquidation_threshold_bps: u32,
        public_penalty_bps: u16,
    ) -> Result<()> {
        instructions::init_config::handler(
            ctx,
            reserve_spread_bps,
            bond_pct_bps,
            min_bond_amount,
            max_drift_bps,
            rescue_window_slots,
            settlement_window_slots,
            runner_up_window_slots,
            target_hf_bps,
            cooldown_slots,
            liquidation_threshold_bps,
            public_penalty_bps,
        )
    }

    /// Admin update for protocol parameters.
    pub fn update_config(
        ctx: Context<UpdateConfig>,
        reserve_spread_bps: Option<u16>,
        bond_pct_bps: Option<u16>,
        min_bond_amount: Option<u64>,
        max_drift_bps: Option<u16>,
        rescue_window_slots: Option<u64>,
        settlement_window_slots: Option<u64>,
        runner_up_window_slots: Option<u64>,
        target_hf_bps: Option<u32>,
        cooldown_slots: Option<u64>,
        liquidation_threshold_bps: Option<u32>,
        public_penalty_bps: Option<u16>,
    ) -> Result<()> {
        instructions::update_config::handler(
            ctx,
            reserve_spread_bps,
            bond_pct_bps,
            min_bond_amount,
            max_drift_bps,
            rescue_window_slots,
            settlement_window_slots,
            runner_up_window_slots,
            target_hf_bps,
            cooldown_slots,
            liquidation_threshold_bps,
            public_penalty_bps,
        )
    }

    /// Open a new lending position.
    pub fn open_position(ctx: Context<OpenPosition>) -> Result<()> {
        instructions::open_position::handler(ctx)
    }

    /// Deposit collateral into an active position.
    pub fn deposit_collateral(ctx: Context<DepositCollateral>, amount: u64) -> Result<()> {
        instructions::deposit_collateral::handler(ctx, amount)
    }

    /// Borrow debt tokens against collateral.
    pub fn borrow(ctx: Context<Borrow>, amount: u64, current_price: i64) -> Result<()> {
        instructions::borrow::handler(ctx, amount, current_price)
    }

    /// Flag a deteriorating position as AT_RISK.
    pub fn flag_at_risk(ctx: Context<FlagAtRisk>, current_price: i64) -> Result<()> {
        instructions::flag_at_risk::handler(ctx, current_price)
    }

    /// Initiate a rescue session and delegate PositionPDA to the MagicBlock TEE.
    pub fn initiate_rescue(ctx: Context<InitiateRescue>, current_price: i64) -> Result<()> {
        instructions::initiate_rescue::handler(ctx, current_price)
    }

    /// Standard public liquidation path (only callable when position is Liquidatable).
    pub fn liquidate(ctx: Context<Liquidate>, repay_debt_amount: u64, current_price: i64) -> Result<()> {
        instructions::liquidate::handler(ctx, repay_debt_amount, current_price)
    }
}
