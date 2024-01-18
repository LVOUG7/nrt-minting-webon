import "@/util/i18n"; // needed to initialize i18next
import React, { useEffect } from "react";
// import "@/common/colors.css";
import { useNrtPrice } from "../../../util/use-nrt-price";
import { useTranslation } from "react-i18next";
import { Alert, CircularProgress } from "@mui/material";
import { CongratDialogSlide } from "@/app/minting/ui/CongratDialog";
import { fetchMintingNft, MintingNft, submitClaimTransaction } from "@/web3/web3-minting";
import { UnreachableCaseError } from "../../../util/typesafe";
import { useEvmAddress } from "@/web3/web3-common";
import { ClaimedRewards, MintingNftBox, TitleBox } from "../ui/ClaimRewardsComponents";
import { fetchMintingTokenIDs } from "@/web3/nft-fetching";
import { useMintingNFTs } from "@/web3/nft-fetching";
import { claimRewardsMainFlexBox } from "../ui/claim-style";
import ErrorDetails from "@/common/ErrorDetails";
import { useNomoTheme } from "@/util/util";
import { getNFTID } from "@/web3/navigation";
import "./ClaimRewardsPage.scss";

export type PageState =
  | "PENDING_TOKENID_FETCH"
  | "PENDING_DETAILS_FETCH"
  | "PENDING_SUBMIT_TX"
  | "IDLE"
  | "ERROR_NO_NFTS_CLAIM"
  | "ERROR_INSUFFICIENT_ETH"
  | "ERROR_TX_FAILED"
  | "ERROR_FETCH_FAILED";

export function isPendingState(pageState: PageState) {
  return pageState.startsWith("PENDING");
}

export function isErrorState(pageState: PageState) {
  return pageState.startsWith("ERROR");
}

const ClaimRewardsPage: React.FC = () => {
  useNomoTheme();

  const { evmAddress } = useEvmAddress();
  const { nrtPrice } = useNrtPrice();
  const [pageState, setPageState] = React.useState<PageState>("PENDING_TOKENID_FETCH");
  const [tokenIDs, setTokenIDs] = React.useState<Array<bigint>>([]);
  const [fetchError] = React.useState<Error | null>(null);
  const { mintingNFTs: stakingNFTs } = useMintingNFTs();
  const [congratDialogOpen, setCongratDialogOpen] = React.useState(false);

  function refreshOnChainData() {
    console.log("Refreshing on-chain data...");
    setTokenIDs([...tokenIDs]);
  }

  function doClaim(args: { tokenIDs: Array<bigint> }) {
    if (!evmAddress) {
      setPageState("ERROR_INSUFFICIENT_ETH");
      return;
    }
    setPageState("PENDING_SUBMIT_TX");
    submitClaimTransaction({ tokenIDs: args.tokenIDs, ethAddress: evmAddress })
      .then((error: any) => {
        if (error) {
          setPageState(error);
        } else {
          setPageState("IDLE");
          setCongratDialogOpen(true);
        }
      })
      .catch((e) => {
        setPageState("ERROR_TX_FAILED");
        console.error(e);
      });
  }

  function onClickClaim(stakingNft: MintingNft) {
    doClaim({ tokenIDs: [stakingNft.tokenId] });
  }

  const nftID = getNFTID();
  const selectedNFT = nftID && !!stakingNFTs ? stakingNFTs[Number(nftID)] : undefined;
  console.log("selectedNFT", selectedNFT);

  return (
    <div className="claim-rewards-page-container">
      <div>
        <TitleBox showBackButton={!selectedNFT} />
        {pageState === "IDLE" ? <ClaimedRewards stakingNFTs={stakingNFTs} /> : <StatusBox pageState={pageState} />}
      </div>
      <div>
        {selectedNFT ? (
          <MintingNftBox
            key={selectedNFT.tokenId}
            avinocPrice={nrtPrice}
            stakingNft={selectedNFT}
            pageState={pageState as any}
            onClickClaim={onClickClaim}
          />
        ) : (
          <div>
            {Object.values(stakingNFTs).map((stakingNft) => {
              return (
                <MintingNftBox
                  key={stakingNft.tokenId}
                  avinocPrice={nrtPrice}
                  stakingNft={stakingNft}
                  pageState={pageState as any}
                  onClickClaim={onClickClaim}
                />
              );
            })}
            {Object.values(stakingNFTs).map((stakingNft) => {
              return (
                <MintingNftBox
                  key={stakingNft.tokenId}
                  avinocPrice={nrtPrice}
                  stakingNft={stakingNft}
                  pageState={pageState as any}
                  onClickClaim={onClickClaim}
                />
              );
            })}
          </div>
        )}
      </div>

      {selectedNFT ? (
        <MintingNftBox
          key={selectedNFT.tokenId}
          avinocPrice={nrtPrice}
          stakingNft={selectedNFT}
          pageState={pageState as any}
          onClickClaim={onClickClaim}
        />
      ) : (
        <div className={"scroll-container"}>
          {Object.values(stakingNFTs).map((stakingNft) => {
            return (
              <MintingNftBox
                key={stakingNft.tokenId}
                avinocPrice={nrtPrice}
                stakingNft={stakingNft}
                pageState={pageState as any}
                onClickClaim={onClickClaim}
              />
            );
          })}
        </div>
      )}

      {/* <Card
        style={{
          display: Object.values(stakingNFTs).length >= 2 ? undefined : "none",
          width: "90%",
          height: "fit-content",
        }}
      >
        <ClaimAllButton
          disabled={isPendingState(pageState)}
          onClick={onClickClaimAll}
        />
      </Card> */}

      {pageState === "IDLE" ? (
        <ClaimedRewards stakingNFTs={stakingNFTs} />
      ) : (
        <StatusBox pageState={pageState} />
      )}

      <CongratDialogSlide
        isOpen={congratDialogOpen}
        handleClose={() => {
          setCongratDialogOpen(false);
          refreshOnChainData();
        }}
        translationKey={"reward.DialogSuccess"}
      />

      {!!fetchError && <ErrorDetails error={fetchError} />}
    </div>
  );
};

const StatusBox: React.FC<{ pageState: PageState }> = (props) => {
  const { t } = useTranslation();
  function getStatusMessage() {
    switch (props.pageState) {
      case "ERROR_FETCH_FAILED":
      case "ERROR_TX_FAILED":
      case "ERROR_NO_NFTS_CLAIM":
      case "ERROR_INSUFFICIENT_ETH":
      case "PENDING_DETAILS_FETCH":
      case "PENDING_TOKENID_FETCH":
      case "PENDING_SUBMIT_TX":
        return t("status." + props.pageState);
      case "IDLE":
        return ""; // should never happen
      default:
        throw new UnreachableCaseError(props.pageState);
    }
  }
  if (isErrorState(props.pageState)) {
    return (
      <div style={{ margin: "10px" }}>
        <Alert severity={"error"}>{getStatusMessage()}</Alert>
      </div>
    );
  } else {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          marginBottom: "5px",
        }}
      >
        <CircularProgress />
        <div
          style={{
            fontWeight: "bold",
            marginLeft: "5px",
            display: "flex",
            alignItems: "center",
          }}
        >
          {getStatusMessage()}
        </div>
      </div>
    );
  }
};

export default ClaimRewardsPage;
