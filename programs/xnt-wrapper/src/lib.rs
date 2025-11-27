use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo, Burn};

declare_id!("2Q8A2o2NkAeze9i38XJqMwdKNkygg52xK9HaXkSc539a");

#[program]
pub mod xnt_wrapper {
    use super::*;

    /// Initialize the wXNT mint (one-time setup)
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("wXNT wrapper initialized");
        Ok(())
    }

    /// Wrap native XNT into wXNT tokens
    /// User sends native XNT, receives wXNT 1:1
    pub fn wrap(ctx: Context<Wrap>, amount: u64) -> Result<()> {
        require!(amount > 0, ErrorCode::InvalidAmount);

        // Transfer native XNT from user to wrapper program
        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.user.key(),
            &ctx.accounts.wrapper_authority.key(),
            amount,
        );
        
        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.user.to_account_info(),
                ctx.accounts.wrapper_authority.to_account_info(),
            ],
        )?;

        // Mint wXNT tokens to user's token account
        let seeds = &[
            b"wrapper-authority",
            &[ctx.bumps.wrapper_authority],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = MintTo {
            mint: ctx.accounts.wxnt_mint.to_account_info(),
            to: ctx.accounts.user_wxnt_account.to_account_info(),
            authority: ctx.accounts.wrapper_authority.to_account_info(),
        };
        
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        
        token::mint_to(cpi_ctx, amount)?;

        msg!("Wrapped {} XNT to wXNT", amount);
        Ok(())
    }

    /// Unwrap wXNT tokens back to native XNT
    /// User burns wXNT, receives native XNT 1:1
    pub fn unwrap(ctx: Context<Unwrap>, amount: u64) -> Result<()> {
        require!(amount > 0, ErrorCode::InvalidAmount);

        // Burn wXNT tokens from user's account
        let cpi_accounts = Burn {
            mint: ctx.accounts.wxnt_mint.to_account_info(),
            from: ctx.accounts.user_wxnt_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        
        token::burn(cpi_ctx, amount)?;

        // Transfer native XNT back to user
        **ctx.accounts.wrapper_authority.to_account_info().try_borrow_mut_lamports()? -= amount;
        **ctx.accounts.user.to_account_info().try_borrow_mut_lamports()? += amount;

        msg!("Unwrapped {} wXNT to XNT", amount);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = payer,
        mint::decimals = 9,
        mint::authority = wrapper_authority,
        mint::freeze_authority = wrapper_authority,
    )]
    pub wxnt_mint: Account<'info, Mint>,
    
    /// CHECK: PDA authority for the wrapper program
    #[account(
        seeds = [b"wrapper-authority"],
        bump,
    )]
    pub wrapper_authority: UncheckedAccount<'info>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Wrap<'info> {
    #[account(mut)]
    pub wxnt_mint: Account<'info, Mint>,
    
    /// CHECK: PDA authority that holds native XNT
    #[account(
        mut,
        seeds = [b"wrapper-authority"],
        bump,
    )]
    pub wrapper_authority: UncheckedAccount<'info>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = wxnt_mint,
        associated_token::authority = user,
    )]
    pub user_wxnt_account: Account<'info, TokenAccount>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, anchor_spl::associated_token::AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Unwrap<'info> {
    #[account(mut)]
    pub wxnt_mint: Account<'info, Mint>,
    
    /// CHECK: PDA authority that holds native XNT
    #[account(
        mut,
        seeds = [b"wrapper-authority"],
        bump,
    )]
    pub wrapper_authority: UncheckedAccount<'info>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        mut,
        associated_token::mint = wxnt_mint,
        associated_token::authority = user,
    )]
    pub user_wxnt_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Amount must be greater than 0")]
    InvalidAmount,
}
