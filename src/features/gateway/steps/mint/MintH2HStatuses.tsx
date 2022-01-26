import { Box, Divider, Fade, Typography } from "@material-ui/core";
import { Gateway, GatewayTransaction } from "@renproject/ren";
import { ChainTransactionStatus, ContractChain } from "@renproject/utils";
import React, { FunctionComponent, ReactNode, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import {
  ActionButton,
  MultipleActionButtonWrapper,
} from "../../../../components/buttons/Buttons";
import { NumberFormatText } from "../../../../components/formatting/NumberFormatText";
import {
  HorizontalPadder,
  MediumTopWrapper,
} from "../../../../components/layout/LayoutHelpers";
import { PaperContent } from "../../../../components/layout/Paper";
import {
  InlineSkeleton,
  ProgressWithContent,
  ProgressWrapper,
  TransactionStatusInfo,
} from "../../../../components/progress/ProgressHelpers";
import { TooltipWithIcon } from "../../../../components/tooltips/TooltipWithIcon";
import {
  AssetInfo,
  LabelWithValue,
  SimpleAssetInfo,
} from "../../../../components/typography/TypographyHelpers";
import { getChainConfig } from "../../../../utils/chainsConfig";
import { undefinedForNull } from "../../../../utils/propsUtils";
import {
  getAssetConfig,
  getRenAssetName,
} from "../../../../utils/tokensConfig";
import { SubmitErrorDialog } from "../../../transactions/components/TransactionsHelpers";
import {
  useCurrentChainWallet,
  useSyncWalletChain,
  useWallet,
} from "../../../wallet/walletHooks";
import { $wallet } from "../../../wallet/walletSlice";
import {
  getGatewayParams,
  useEthereumChainAssetBalance,
} from "../../gatewayHooks";
import { useChainTransactionSubmitter } from "../../gatewayTransactionHooks";
import { FeesToggler } from "../shared/FeeHelpers";
import { SwitchWalletDialog } from "../shared/WalletSwitchHelpers";

type MintH2HLockTransactionStatusProps = {
  gateway: Gateway;
  Fees: ReactNode | null;
  outputAmount: string | null;
  outputAmountUsd: string | null;
};

export const MintH2HLockTransactionStatus: FunctionComponent<
  MintH2HLockTransactionStatusProps
> = ({ gateway, Fees, outputAmount, outputAmountUsd }) => {
  const { t } = useTranslation();
  const { asset, amount } = getGatewayParams(gateway);
  const assetConfig = getAssetConfig(asset);
  const renAsset = getRenAssetName(asset);
  const { balance } = useEthereumChainAssetBalance(
    gateway.fromChain as ContractChain,
    asset
  );
  const { RenIcon } = assetConfig;

  const {
    handleSubmit,
    submitting,
    done,
    waiting,
    errorSubmitting,
    handleReset,
  } = useChainTransactionSubmitter(gateway.in);

  return (
    <>
      <PaperContent bottomPadding>
        <HorizontalPadder>
          <LabelWithValue
            label={t("common.balance") + ":"}
            value={
              <span>
                {balance === null ? (
                  <InlineSkeleton
                    variant="rect"
                    animation="pulse"
                    width={40}
                    height={12}
                  />
                ) : (
                  <Fade in={true}>
                    <span>{balance}</span>
                  </Fade>
                )}
                <span> {asset}</span>
              </span>
            }
          />
        </HorizontalPadder>
        <SimpleAssetInfo
          label={t("mint.minting-label")}
          value={amount}
          asset={asset}
        />
        <MediumTopWrapper>
          <AssetInfo
            label={t("common.receiving-label")}
            value={
              <NumberFormatText
                value={outputAmount}
                spacedSuffix={renAsset}
                decimalScale={3} // TODO: make dynamic decimal scale based on input decimals
              />
            }
            valueEquivalent={
              outputAmountUsd !== null ? (
                <NumberFormatText
                  prefix=" = $"
                  value={outputAmountUsd}
                  spacedSuffix="USD"
                  decimalScale={2}
                  fixedDecimalScale
                />
              ) : null
            }
            Icon={<RenIcon fontSize="inherit" />}
          />
        </MediumTopWrapper>
      </PaperContent>
      <Divider />
      <PaperContent topPadding darker>
        {Fees}
        <HorizontalPadder>
          <Box
            mt={3}
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Box maxWidth={240}>
              <Typography variant="caption" color="textSecondary">
                {t("h2h.network-switching-message")}
              </Typography>
            </Box>
            <TooltipWithIcon title={t("h2h.network-switching-tooltip")} />
          </Box>
        </HorizontalPadder>
        <MultipleActionButtonWrapper>
          <ActionButton
            onClick={handleSubmit}
            disabled={submitting || waiting || done}
          >
            {submitting || waiting
              ? t("gateway.submitting-tx-label")
              : t("gateway.submit-tx-label")}
          </ActionButton>
          {errorSubmitting && (
            <SubmitErrorDialog
              open={true}
              error={errorSubmitting}
              onAction={handleReset}
            />
          )}
        </MultipleActionButtonWrapper>
      </PaperContent>
    </>
  );
};

type MintH2HLockTransactionProgressStatusProps = {
  gateway: Gateway;
  transaction: GatewayTransaction;
  Fees: ReactNode | null;
  outputAmount: string | null;
  outputAmountUsd: string | null;
  lockStatus: ChainTransactionStatus | null;
  lockConfirmations: number | null;
  lockTargetConfirmations: number | null;
};

export const MintH2HLockTransactionProgressStatus: FunctionComponent<
  MintH2HLockTransactionProgressStatusProps
> = ({
  gateway,
  transaction,
  Fees,
  outputAmount,
  outputAmountUsd,
  lockConfirmations,
  lockTargetConfirmations,
  lockStatus,
}) => {
  const { t } = useTranslation();
  const { asset, from, to, amount } = getGatewayParams(gateway);
  const fromChainConfig = getChainConfig(from);
  const assetConfig = getAssetConfig(asset);
  const renAsset = getRenAssetName(asset);
  const { RenIcon } = assetConfig;

  const renVM = useChainTransactionSubmitter(transaction.renVM);
  const out = useChainTransactionSubmitter(transaction.out);

  const handleSubmitBoth = useCallback(async () => {
    await renVM.handleSubmit();
    await out.handleSubmit();
  }, [renVM.handleSubmit, out.handleSubmit]);

  const Icon = fromChainConfig.Icon;

  const { chain } = useSelector($wallet);
  const { connected } = useWallet(to);
  const showSwitchWalletDialog =
    lockStatus === ChainTransactionStatus.Done && !connected;
  console.log("ccl", chain, connected, lockStatus);
  return (
    <>
      <SwitchWalletDialog open={showSwitchWalletDialog} targetChain={to} />
      <PaperContent bottomPadding>
        <ProgressWrapper>
          <ProgressWithContent
            confirmations={undefinedForNull(lockConfirmations)}
            targetConfirmations={undefinedForNull(lockTargetConfirmations)}
          >
            <Icon fontSize="inherit" />
          </ProgressWithContent>
        </ProgressWrapper>

        <SimpleAssetInfo
          label={t("mint.minting-label")}
          value={amount}
          asset={asset}
        />
        <MediumTopWrapper>
          <AssetInfo
            label={t("common.receiving-label")}
            value={
              <NumberFormatText
                value={outputAmount}
                spacedSuffix={renAsset}
                decimalScale={3} // TODO: make dynamic decimal scale based on input decimals
              />
            }
            valueEquivalent={
              outputAmountUsd !== null ? (
                <NumberFormatText
                  prefix=" = $"
                  value={outputAmountUsd}
                  spacedSuffix="USD"
                  decimalScale={2}
                  fixedDecimalScale
                />
              ) : null
            }
            Icon={<RenIcon fontSize="inherit" />}
          />
        </MediumTopWrapper>
      </PaperContent>
      <Divider />
      <PaperContent topPadding darker>
        <FeesToggler>{Fees}</FeesToggler>
        <HorizontalPadder>
          <Box
            mt={3}
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Box maxWidth={240}>
              <Typography variant="caption" color="textSecondary">
                {t("h2h.network-switching-message")}
              </Typography>
            </Box>
            <TooltipWithIcon title={t("h2h.network-switching-tooltip")} />
          </Box>
        </HorizontalPadder>
        <MultipleActionButtonWrapper>
          <ActionButton
            onClick={handleSubmitBoth}
            disabled={
              out.submitting ||
              out.waiting ||
              out.done ||
              renVM.submitting ||
              renVM.waiting ||
              renVM.done ||
              lockStatus === ChainTransactionStatus.Confirming
            }
          >
            {out.submitting || out.waiting || renVM.submitting || renVM.waiting
              ? t("gateway.submitting-tx-label")
              : t("gateway.submit-tx-label")}
          </ActionButton>
          {renVM.errorSubmitting && (
            <SubmitErrorDialog
              open={true}
              error={renVM.errorSubmitting}
              onAction={renVM.handleReset}
            />
          )}
          {out.errorSubmitting && (
            <SubmitErrorDialog
              open={true}
              error={out.errorSubmitting}
              onAction={out.handleReset}
            />
          )}
        </MultipleActionButtonWrapper>
      </PaperContent>
    </>
  );
};

type MintH2HMintTransactionProgressStatusProps = {
  gateway: Gateway;
  transaction: GatewayTransaction;
  renVMStatus: ChainTransactionStatus | null;
  mintStatus: ChainTransactionStatus | null;
  mintConfirmations: number | null;
  mintTargetConfirmations: number | null;
  outputAmount: string | null;
  outputAmountUsd: string | null;
  Fees: ReactNode | null;
};

export const MintH2HMintTransactionProgressStatus: FunctionComponent<
  MintH2HMintTransactionProgressStatusProps
> = ({
  gateway,
  transaction,
  renVMStatus,
  mintConfirmations,
  mintTargetConfirmations,
  mintStatus,
  outputAmount,
  outputAmountUsd,
  Fees,
}) => {
  const { t } = useTranslation();
  const { asset, to, amount } = getGatewayParams(gateway);
  const mintChainConfig = getChainConfig(to);
  const assetConfig = getAssetConfig(asset);
  const renAsset = getRenAssetName(asset);

  const renVM = useChainTransactionSubmitter(transaction.renVM);
  const out = useChainTransactionSubmitter(transaction.out);

  const handleSubmitBoth = useCallback(async () => {
    await renVM.handleSubmit();
    await out.handleSubmit();
  }, [renVM.handleSubmit, out.handleSubmit]);

  const { RenIcon } = assetConfig;
  const Icon = mintChainConfig.Icon;
  return (
    <>
      <PaperContent bottomPadding>
        <ProgressWrapper>
          {renVMStatus === ChainTransactionStatus.Confirming ? (
            <ProgressWithContent processing>
              <TransactionStatusInfo status="Submitting to RenVM..." />
            </ProgressWithContent>
          ) : (
            <ProgressWithContent
              confirmations={undefinedForNull(mintConfirmations)}
              targetConfirmations={undefinedForNull(mintTargetConfirmations)}
            >
              <Icon fontSize="inherit" />
            </ProgressWithContent>
          )}
        </ProgressWrapper>

        <SimpleAssetInfo
          label={t("mint.minting-label")}
          value={amount}
          asset={asset}
        />
        <MediumTopWrapper>
          <AssetInfo
            label={t("common.receiving-label")}
            value={
              <NumberFormatText
                value={outputAmount}
                spacedSuffix={renAsset}
                decimalScale={3} // TODO: make dynamic decimal scale based on input decimals
              />
            }
            valueEquivalent={
              outputAmountUsd !== null ? (
                <NumberFormatText
                  prefix=" = $"
                  value={outputAmountUsd}
                  spacedSuffix="USD"
                  decimalScale={2}
                  fixedDecimalScale
                />
              ) : null
            }
            Icon={<RenIcon fontSize="inherit" />}
          />
        </MediumTopWrapper>
      </PaperContent>
      <Divider />
      <PaperContent topPadding darker>
        {Fees}
        <HorizontalPadder>
          <Box
            mt={3}
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Box maxWidth={240}>
              <Typography variant="caption" color="textSecondary">
                {t("h2h.network-switching-message")}
              </Typography>
            </Box>
            <TooltipWithIcon title={t("h2h.network-switching-tooltip")} />
          </Box>
        </HorizontalPadder>
        <MultipleActionButtonWrapper>
          <ActionButton
            onClick={handleSubmitBoth}
            disabled={
              out.submitting ||
              out.waiting ||
              out.done ||
              renVM.submitting ||
              renVM.waiting ||
              renVM.done ||
              mintStatus === ChainTransactionStatus.Confirming
            }
          >
            {out.submitting || out.waiting || renVM.submitting || renVM.waiting
              ? t("gateway.submitting-tx-label")
              : t("gateway.submit-tx-label")}
          </ActionButton>
          {renVM.errorSubmitting && (
            <SubmitErrorDialog
              open={true}
              error={renVM.errorSubmitting}
              onAction={renVM.handleReset}
            />
          )}
          {out.errorSubmitting && (
            <SubmitErrorDialog
              open={true}
              error={out.errorSubmitting}
              onAction={out.handleReset}
            />
          )}
        </MultipleActionButtonWrapper>
      </PaperContent>
    </>
  );
};