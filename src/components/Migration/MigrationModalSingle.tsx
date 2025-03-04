import {
  Backdrop,
  Box,
  Button,
  ButtonBase,
  Fade,
  Modal,
  SvgIcon,
  Table,
  TableCell,
  TableHead,
  TableRow,
  TableBody,
  Typography,
  Paper,
  Tab,
  Tabs,
} from "@material-ui/core";
import useMediaQuery from "@material-ui/core/useMediaQuery";

// import ButtonUnstyled from "@mui/core/ButtonUnstyled";
import { ReactComponent as XIcon } from "../../assets/icons/x.svg";
import { makeStyles } from "@material-ui/core/styles";
import { useDispatch } from "react-redux";
import { BigNumber } from "ethers";
import {
  changeMigrationApproval,
  migrateAll,
  migrateSingle,
  migrateWithType,
  TokenType,
} from "src/slices/MigrateThunk";
import { useWeb3Context } from "src/hooks";
import { useEffect, useMemo, useState } from "react";
import { isPendingTxn, txnButtonText } from "src/slices/PendingTxnsSlice";
import { info } from "src/slices/MessagesSlice";
import { InfoTooltip } from "@olympusdao/component-library";
import "./migration-modal.scss";
import { useAppSelector } from "src/hooks";
import { trim } from "src/helpers";
import { t, Trans } from "@lingui/macro";
import { NetworkId } from "src/constants";
const formatCurrency = (c: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(c);
};
const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  bgcolor: "background.paper",
  boxShadow: 24,
  p: 2,
  zIndex: 3,
  maxWidth: 600,
  minWidth: 300,
  borderRadius: 10,
};

const useStyles = makeStyles({
  custom: {
    color: "#00EE00",
  },
});

function MigrationModalSingle({ open, handleClose }: { open: boolean; handleClose: any }) {
  const dispatch = useDispatch();
  const classes = useStyles();
  const isMobileScreen = useMediaQuery("(max-width: 513px)");
  const { provider, address, networkId } = useWeb3Context();

  const [view, setView] = useState(0);
  const changeView = (_event: React.ChangeEvent<{}>, newView: number) => {
    setView(newView);
  };

  const pendingTransactions = useAppSelector(state => {
    return state.pendingTransactions;
  });

  const oldAssetsDetected = useAppSelector(state => {
    return (
      state.account.balances &&
      (Number(state.account.balances.sohmV1) ||
      Number(state.account.balances.ohmV1) ||
      Number(state.account.balances.wsohm)
        ? true
        : false)
    );
  });

  let rows = [];

  const onSeekApproval = (token: string) => {
    dispatch(
      changeMigrationApproval({
        address,
        networkID: networkId,
        provider,
        token: token.toLowerCase(),
        displayName: token,
        insertName: true,
      }),
    );
  };

  const indexV1 = useAppSelector(state => Number(state.app.currentIndexV1!));
  const currentIndex = useAppSelector(state => Number(state.app.currentIndex));

  const currentOhmBalance = useAppSelector(state => state.account.balances.ohmV1);
  const currentSOhmBalance = useAppSelector(state => state.account.balances.sohmV1);
  const currentWSOhmBalance = useAppSelector(state => state.account.balances.wsohm);
  const wsOhmPrice = useAppSelector(state => state.app.marketPrice! * Number(state.app.currentIndex!));
  const gOHMPrice = wsOhmPrice;

  /**
   * V2!!! market price
   */
  const marketPrice = useAppSelector(state => {
    return state.app.marketPrice;
  });
  const approvedOhmBalance = useAppSelector(state => Number(state.account.migration.ohm));
  const approvedSOhmBalance = useAppSelector(state => Number(state.account.migration.sohm));
  const approvedWSOhmBalance = useAppSelector(state => Number(state.account.migration.wsohm));
  const ohmFullApproval = approvedOhmBalance >= +currentOhmBalance;
  const sOhmFullApproval = approvedSOhmBalance >= +currentSOhmBalance;
  const wsOhmFullApproval = approvedWSOhmBalance >= +currentWSOhmBalance;

  const ohmAsgOHM = +currentOhmBalance / currentIndex;
  const sOHMAsgOHM = +currentSOhmBalance / indexV1;

  const ohmInUSD = formatCurrency(gOHMPrice! * ohmAsgOHM);
  const sOhmInUSD = formatCurrency(gOHMPrice! * sOHMAsgOHM);
  const wsOhmInUSD = formatCurrency(wsOhmPrice * +currentWSOhmBalance);

  const isGOHM = view === 0;
  const targetAsset = useMemo(() => (isGOHM ? "gOHM" : "sOHM (v2)"), [view]);
  const targetMultiplier = useMemo(() => (isGOHM ? 1 : currentIndex), [currentIndex, view]);

  const onMigrate = (type: number, amount: string) =>
    dispatch(migrateSingle({ provider, address, networkID: networkId, gOHM: isGOHM, type, amount }));

  rows = [
    {
      initialAsset: "OHM",
      initialBalance: currentOhmBalance,
      targetAsset: targetAsset,
      targetBalance: ohmAsgOHM * targetMultiplier,
      fullApproval: ohmFullApproval,
      usdBalance: ohmInUSD,
      type: TokenType.UNSTAKED,
      display: gOHMPrice! * ohmAsgOHM > 10,
    },
    {
      initialAsset: "sOHM",
      initialBalance: currentSOhmBalance,
      targetAsset: targetAsset,
      targetBalance: sOHMAsgOHM * targetMultiplier,
      fullApproval: sOhmFullApproval,
      usdBalance: sOhmInUSD,
      type: TokenType.STAKED,
      display: gOHMPrice! * sOHMAsgOHM > 10,
    },
    {
      initialAsset: "wsOHM",
      initialBalance: currentWSOhmBalance,
      targetAsset: targetAsset,
      targetBalance: +currentWSOhmBalance * targetMultiplier,
      fullApproval: wsOhmFullApproval,
      usdBalance: wsOhmInUSD,
      type: TokenType.WRAPPED,
      display: wsOhmPrice * +currentWSOhmBalance > 10,
    },
  ];

  return (
    <div>
      <Modal
        className="mig-modal-full"
        aria-labelledby="migration-modal-title"
        aria-describedby="migration-modal-description"
        open={open}
        onClose={handleClose}
        closeAfterTransition
        BackdropComponent={Backdrop}
        BackdropProps={{
          timeout: 500,
        }}
      >
        <Fade in={open}>
          <Box display="flex" alignItems="center" justifyContent="center" style={{ width: "100%", height: "100%" }}>
            <Paper className="ohm-card migration-card">
              <Box display="flex" flexDirection="row" alignItems="center" justifyContent="space-between">
                <Button onClick={handleClose}>
                  <SvgIcon component={XIcon} color="primary" />
                </Button>
                <Box paddingRight={isMobileScreen ? 0 : 6}>
                  <Typography id="migration-modal-title" variant="h6" component="h2">
                    {!oldAssetsDetected ? t`Migration complete` : t`You have assets ready to migrate to v2`}
                  </Typography>
                </Box>
                <Box />
              </Box>

              {!oldAssetsDetected ? null : (
                <Box paddingTop={isMobileScreen ? 2 : 4} paddingBottom={isMobileScreen ? 2 : 0}>
                  <Typography
                    id="migration-modal-description"
                    variant="body2"
                    className={isMobileScreen ? `mobile` : ``}
                  >
                    {t`Olympus v2 introduces upgrades to on-chain governance and bonds to enhance decentralization and immutability.`}{" "}
                    <a
                      href="https://docs.olympusdao.finance/main/basics/migration"
                      target="_blank"
                      color="inherit"
                      rel="noreferrer"
                      className="docs-link"
                    >
                      <u>
                        <Trans>Learn More</Trans>
                      </u>
                    </a>
                  </Typography>
                </Box>
              )}
              <Box display="flex" justifyContent="center" marginTop={1}>
                <Typography variant="h5" color="textSecondary">
                  <Trans>Migration Output</Trans>
                </Typography>
              </Box>

              <Tabs
                centered
                value={view}
                textColor="primary"
                indicatorColor="primary"
                onChange={changeView}
                aria-label="payout token tabs"
                className="payout-token-tabs"
              >
                <Tab label={`gOHM`} className="payout-token-tab" />
                <Tab label={`sOHM`} className="payout-token-tab" />
              </Tabs>
              {isMobileScreen ? (
                <Box id="mobile-container-migration">
                  {rows
                    .filter(asset => +asset.initialBalance > 0 && asset.display)
                    .map(row => (
                      <Box style={{ margin: "20px 0px 20px 0px" }}>
                        <Typography
                          id="m-asset-row"
                          style={{ margin: "10px 0px 10px 0px", fontWeight: 700 }}
                        >{`${row.initialAsset} -> ${row.targetAsset}`}</Typography>
                        <Box display="flex" flexDirection="row" justifyContent="space-between">
                          <Typography>
                            {trim(+row.initialBalance, 4)} {row.initialAsset}
                          </Typography>
                          <Typography>{`(${row.usdBalance})`}</Typography>
                        </Box>
                        <Box display="flex" justifyContent="center" style={{ margin: "10px 0px 10px 0px" }}>
                          {!oldAssetsDetected ? (
                            <Typography align="center" className={classes.custom}>
                              <Trans>Migrated</Trans>
                            </Typography>
                          ) : row.fullApproval ? (
                            <Button
                              variant="outlined"
                              onClick={() => onMigrate(row.type, row.initialBalance)}
                              disabled={isPendingTxn(pendingTransactions, `migrate_${row.type}_tokens`)}
                            >
                              <Typography>
                                {txnButtonText(pendingTransactions, `migrate_${row.type}_tokens`, t`Migrate`)}
                              </Typography>
                            </Button>
                          ) : (
                            <Button
                              variant="outlined"
                              onClick={() => onSeekApproval(row.initialAsset)}
                              disabled={isPendingTxn(
                                pendingTransactions,
                                `approve_migration_${row.initialAsset.toLowerCase()}`,
                              )}
                            >
                              <Typography>
                                {txnButtonText(
                                  pendingTransactions,
                                  `approve_migration_${row.initialAsset.toLowerCase()}`,
                                  t`Approve`,
                                )}
                              </Typography>
                            </Button>
                          )}
                        </Box>
                      </Box>
                    ))}
                </Box>
              ) : (
                <Table>
                  <TableHead>
                    <TableRow style={{ verticalAlign: "top" }}>
                      <TableCell align="center">
                        <Typography>Asset</Typography>
                      </TableCell>
                      <TableCell align="left">
                        <Box display="flex">
                          <Box display="inline-flex">
                            <Typography>
                              <Trans>Pre-migration</Trans>
                            </Typography>
                            <InfoTooltip
                              message={t`This is the current balance of v1 assets in your wallet.`}
                              children={undefined}
                            ></InfoTooltip>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell align="left">
                        <Box display="flex" flexDirection="column">
                          <Box display="inline-flex">
                            <Typography>
                              <Trans>Post-migration</Trans>
                            </Typography>
                            <InfoTooltip
                              message={t`This is the equivalent amount of gOHM you will have in your wallet once migration is complete.`}
                              children={undefined}
                            ></InfoTooltip>
                          </Box>
                        </Box>
                        <Box display="inline-flex">
                          <Typography variant="body2">
                            <Trans>(includes rebase rewards)</Trans>
                          </Typography>
                        </Box>
                      </TableCell>

                      <TableCell align="center">
                        <Box display="inline-flex">{/* <Typography>Migration Completion Status</Typography> */}</Box>
                      </TableCell>

                      <TableCell align="left"></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows
                      .filter(asset => +asset.initialBalance > 0 && asset.display)
                      .map(row => (
                        <TableRow key={row.initialAsset}>
                          <TableCell component="th" scope="row">
                            <Typography>{`${row.initialAsset} -> ${row.targetAsset}`}</Typography>
                          </TableCell>
                          <TableCell align="left">
                            <Typography>
                              {trim(+row.initialBalance, 4)} {row.initialAsset}
                              <Typography style={{ marginTop: "10px" }}>{`(${row.usdBalance})`}</Typography>
                            </Typography>
                          </TableCell>
                          <TableCell align="left">
                            <Typography>
                              {trim(row.targetBalance, 4)} {row.targetAsset}
                              <Typography style={{ marginTop: "10px" }}>{`(${row.usdBalance})`}</Typography>
                            </Typography>
                          </TableCell>
                          <TableCell align="left">
                            {!oldAssetsDetected ? (
                              <Typography align="center" className={classes.custom}>
                                <Trans>Migrated</Trans>
                              </Typography>
                            ) : row.fullApproval ? (
                              <Button
                                variant="outlined"
                                onClick={() => onMigrate(row.type, row.initialBalance)}
                                disabled={isPendingTxn(pendingTransactions, `migrate_${row.type}_tokens`)}
                              >
                                <Typography>
                                  {txnButtonText(pendingTransactions, `migrate_${row.type}_tokens`, t`Migrate`)}
                                </Typography>
                              </Button>
                            ) : (
                              <Button
                                variant="outlined"
                                onClick={() => onSeekApproval(row.initialAsset)}
                                disabled={isPendingTxn(
                                  pendingTransactions,
                                  `approve_migration_${row.initialAsset.toLowerCase()}`,
                                )}
                              >
                                <Typography>
                                  {txnButtonText(
                                    pendingTransactions,
                                    `approve_migration_${row.initialAsset.toLowerCase()}`,
                                    t`Approve`,
                                  )}
                                </Typography>
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}

              <div className="help-text">
                <em>
                  <Typography variant="body2" style={isMobileScreen ? { lineHeight: "1em" } : {}}>
                    <Trans>
                      Each asset type requires two transactions. First Approve, then Migrate each asset. Amounts less
                      than 10$ are ignored.
                    </Trans>
                  </Typography>
                </em>
              </div>
            </Paper>
          </Box>
        </Fade>
      </Modal>
    </div>
  );
}

export default MigrationModalSingle;
