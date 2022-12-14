import React, { Component } from 'react'
import OpenViduVideoComponent from './OvVideo'
import styled from 'styled-components'
import { TiMessages } from 'react-icons/ti'
import { IoPersonCircleOutline } from 'react-icons/io5'
import UserProfileModal from './UserProfileModal'
import { connect } from 'react-redux'
import { storeResult, doingVote, storeConnection } from './vote-slice'
import axios from '../../api/http'
import { requestDirectMessage } from '../main/chat/chat-slice'
import { opponentUserProfile } from '../main/profile/profile-slice'
import { ToastsStore } from 'react-toasts'
import {
  getRateRecord,
  putRate,
  setRate,
  getOtherRate,
} from '../main/hashtag/rate-slice'
import Rating from '@mui/material/Rating'

const StreamComponent = styled.div`
  display: flex;
  flex-direction: column;
  width: 250px;
  height: 96%;
  justify-content: center;
  align-items: center;

  &.Commander {
    display: none;
  }
`

const Profile = styled.div`
  text-align: center;
  font-weight: bold;
  margin-bottom: 0.3rem;
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
`

const Nickname = styled.p`
  font-size: 2rem;
  font-family: 'Minseo';
  text-align: center;
  margin: 0;
  display: flex;
  align-items: center;

  &.role2 {
    background-color: #4da39d;
    border-radius: 1rem;
  }
`
const HashList = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: center;
  width: 100%;
`

const RatingBox = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  width: 100%;
  font-family: Minseo;
  font-size: 1.2rem;
`

const RatingBtn = styled.button`
  margin-left: 0.5rem;
  background-color: #f6a9a9;
  border: 2px solid #333333;
  color: #333333;
  border-radius: 1rem;
  font-family: Minseo;
  font-size: 1.2rem;
  cursor: pointer;

  &:hover {
    background-color: #d18181;
  }
`

const RatingCancelBtn = styled.button`
  margin-left: 0.2rem;
  background-color: #4da39d;
  border: 2px solid #333333;
  color: #333333;
  border-radius: 1rem;
  font-family: Minseo;
  font-size: 1.2rem;

  &:hover {
    background-color: #3b837e;
  }
`

const Hashtag = styled.span`
  font-family: Minseo;
  font-size: 1.2rem;
`

const TiMsg = styled(TiMessages)`
  cursor: pointer;
  color: #ff728e;
`

const ProfileIcon = styled(IoPersonCircleOutline)`
  cursor: pointer;
  color: #00c3a9;
`

class UserVideoComponent extends Component {
  constructor(props) {
    super(props)
    this.state = {
      isCommander: false,
      myUserNo: undefined,
      data: JSON.parse(this.props.streamManager.stream.connection.data),
      voteTo: '', // ?????? ??????
      voteRole: 1, // 1: ??????, 2: ?????????
      myUserName: this.props.myUserName,
      myRoleCode: this.props.myRoleCode,
      myPairUser: this.props.myPairUser,

      showIcons: false,
      isDuplicated: false,
      isOpen: false,
      oppositeUserNo: 1,
      userPicUrl: undefined,

      avgRate: undefined,
      rate: undefined,
      rateRecord: false,
      rateModal: false,
      rateNo: undefined,
    }
  }

  async componentDidMount() {
    const { mode, getOtherRate, getOpponentUserProfile } = this.props
    const userNo = mode.user.userNo
    const userNickname = this.state.data.clientData
    const oppositeUserNo = this.state.data.userDatas.userNo

    this.setState({
      myUserNo: userNo,
      voteTo: userNickname,
      oppositeUserNo: oppositeUserNo,
    })

    const picUrlRes = await getOpponentUserProfile(oppositeUserNo)
    console.log('??????????????????????????? url??????', picUrlRes)
    this.setState({ userPicUrl: picUrlRes.payload.data.userProfilePicUrl })

    const avgRes = await getOtherRate(this.state.data.userDatas.userNo)
    console.log('???????????? ??????', avgRes)
    this.setState({ avgRate: avgRes.payload.rateScore })

    // ???????????? ?????? ???????????? ???????????? ?????? ( ?????? ????????? )
    // 1. ?????? ???????????? ??????
    // 2. ????????? ????????? ??????
    // 3. ????????? ???????????????,
    // 3-1. ?????? ???????????? ???, ??? ???????????? ???????????? ???
    // 3-2. ?????? ???????????? ???????????? ???.
    if (this.state.data.clientData !== this.state.myUserName) {
      if (this.state.data.roleCodes === 1) {
        this.storeResult()
        this.storeConnection()
      } else if (this.state.data.roleCodes === 2) {
        if (
          this.state.myRoleCode === 3 &&
          this.state.data.clientData !== this.state.myPairUser.userNickname
        ) {
          this.storeResult()
          this.storeConnection()
        } else if (this.state.myRoleCode !== 3) {
          this.storeResult()
          this.storeConnection()
        }
      }
    } else {
      this.setState({ showIcons: true })
    }
  }

  //?????? ??????
  openUserProfileModal = () => {
    this.setState({ isOpen: !this.state.isOpen })
  }

  // DM?????????
  requestDirectMessage() {
    const { doRequestDirectMessage } = this.props
    axios.get(`/honjaya/chats/ask/${this.state.oppositeUserNo}`).then((res) => {
      if (res.data.trueOrFalse) {
        ToastsStore.info('?????? ????????? ??? ??? ????????????')
        this.setState({ isDuplicated: true })
      } else {
        doRequestDirectMessage(this.state.oppositeUserNo)
          .unwrap()
          .then((res) => {
            if (res.data.trueOrFalse) {
              ToastsStore.info('???? 1:1 ???????????? ?????????????????????! ????')
              this.setState({ isDuplicated: true })
            } else {
              ToastsStore.info('???? 1:1 ?????? ????????? ?????????????????????! ????')
              this.setState({ isDuplicated: true })
            }
          })
          .catch((err) => {
            ToastsStore.info('??????????????? ?????????????????? ????')
            console.log(err)
          })
      }
    })
  }

  // ???????????? ???????????? ????????? ?????? ( ?????? ????????? )
  storeResult() {
    const { doStoreResult } = this.props
    doStoreResult(this.state.data)
  }

  // ???????????? connection ????????? ?????? ( signal ????????? )
  storeConnection() {
    const { doStoreConnection } = this.props
    const streamData = this.props.streamManager.stream.connection
    doStoreConnection([this.state.data.clientData, streamData])
  }

  // ?????? ?????? ??????
  changeVote() {
    if (this.state.voteRole === 1) {
      this.setState({ voteRole: 2 })
    } else if (this.state.voteRole === 2) {
      this.setState({ voteRole: 1 })
    }
  }

  // ?????? ???????????? slice??? ??????
  async doingVote() {
    await this.changeVote()
    const { doDoingVote } = this.props
    const data = {
      voteTo: this.state.voteTo,
      voteRole: this.state.voteRole,
    }
    await doDoingVote(data)
  }

  //?????? ????????????
  async onhandleRate() {
    if (this.state.rateModal === false) {
      const { getRateRecord } = this.props
      const record = await getRateRecord(this.state.data.userDatas.userNo)
      if (record.payload.data.rateScore !== 0) {
        this.setState({ rateRecord: true })
      }
      this.setState({ rateNo: record.payload.data.rateNo })
      this.setState({ rate: record.payload.data.rateScore })
      this.setState({ rateModal: true })
    } else {
      this.setState({ rateModal: false })
    }
  }

  async sendRate() {
    const { setRate, putRate, getOtherRate } = this.props
    if (this.state.rateRecord === false) {
      const rateData = {
        rateTo: this.state.data.userDatas.userNo,
        rateScore: this.state.rate,
      }
      await setRate(rateData)
      await getOtherRate(this.state.data.userDatas.userNo).then((res) => {
        const new_avgRate = res.payload.rateScore
        this.setState({ avgRate: new_avgRate })
      })
    } else {
      const rateData = {
        rateNo: this.state.rateNo,
        rateScore: this.state.rate,
      }
      await putRate(rateData)
      await getOtherRate(this.state.data.userDatas.userNo).then((res) => {
        const new_avgRate = res.payload.rateScore
        this.setState({ avgRate: new_avgRate })
      })
    }
    this.setState({ rateModal: false })
  }

  render() {
    return (
      <>
        {/* ???????????? */}
        {this.props.meetingTime && this.props.streamManager !== undefined ? (
          <StreamComponent className={this.state.data.roleCodes === 3 ? 'Commander' : 'etc'}>
            <Profile>
              <Nickname>
                {this.state.data.clientData}{' '}
              </Nickname>
              <HashList>
                {/* Hashtags??? ???????????? ???????????? ???????????? undefined ????????? ?????? ????????? ????????? ????????????????????????
                  &&??? ???????????? ????????? ???????????? ?????? ???????????? ??? */}
                {this.state.data.hashtags &&
                  this.state.data.hashtags.map((item, idx) => (
                    <Hashtag># {item[1]} </Hashtag>
                  ))}
              </HashList>
            </Profile>
            <OpenViduVideoComponent streamManager={this.props.streamManager} />
          </StreamComponent>
        ) : null}

        {/* ???????????? */}
        {this.props.voteTime && this.props.streamManager !== undefined ? (
          <StreamComponent
            className={this.state.data.roleCodes === 3 ? 'Commander' : 'etc'}
            onClick={() => this.doingVote()}
          >
            <Profile>
              <Nickname className={`role${this.state.voteRole}`}>
                {this.state.data.clientData}
              </Nickname>
            </Profile>
            <OpenViduVideoComponent streamManager={this.props.streamManager} />
          </StreamComponent>
        ) : null}

        {/* ?????????????????? */}
        {this.props.resultTime && this.props.streamManager !== undefined ? (
          <StreamComponent className="StreamComponent">
            <Profile>
              <Nickname>
                {this.state.data.clientData}{' '}
                <ProfileIcon onClick={() => { this.openUserProfileModal() }} />
                {this.state.isOpen ? (
                  <UserProfileModal
                    openUserProfileModal={this.openUserProfileModal}
                    oppositeUserNo={this.state.oppositeUserNo}
                    myUserNo={this.state.myUserNo}
                    userProfilePicUrl={this.state.userPicUrl}
                  />
                ) : null}
                {!this.state.showIcons && !this.state.isDuplicated ? (
                  <TiMsg onClick={() => {this.requestDirectMessage()}}/>
                ) : null}
              </Nickname>

              <RatingBox>
                {this.state.rateModal ? (
                  <>
                    <Rating
                      name="simple-controlled"
                      precision={0.5}
                      value={this.state.rate}
                      onChange={(event, newValue) => { this.setState({ rate: newValue })}}
                    />
                    {this.state.rate}
                    <RatingBtn onClick={() => this.sendRate()}>??????</RatingBtn>
                    <RatingCancelBtn onClick={() => this.setState({ rateModal: false })}>
                      ??????
                    </RatingCancelBtn>
                  </>
                ) : (
                  <>
                    {this.state.avgRate ? (
                      <>
                        <Rating
                          name="avgRate"
                          precision={0.5}
                          value={this.state.avgRate}
                          readOnly
                        />
                        {this.state.avgRate}
                      </>
                    ) : (
                      <>
                        <Rating
                          name="avgRate"
                          precision={0.5}
                          value={0}
                          readOnly
                        />
                        {'0'}
                      </>
                    )}

                    <RatingBtn onClick={() => this.onhandleRate()}>
                      ????????????
                    </RatingBtn>
                  </>
                )}
              </RatingBox>
            </Profile>
            <OpenViduVideoComponent streamManager={this.props.streamManager} />
          </StreamComponent>
        ) : null}
      </>
    )
  }
}

const mapStateToProps = (state) => ({
  mode: state.mode,
  point: state.point,
  vote: state.vote,
  chat: state.chat,
  profile: state.profile,
})

const mapDispatchToProps = (dispatch) => {
  return {
    doStoreResult: (data) => dispatch(storeResult(data)),
    doStoreConnection: (data) => dispatch(storeConnection(data)),
    doDoingVote: (data) => dispatch(doingVote(data)),
    doRequestDirectMessage: (data) => dispatch(requestDirectMessage(data)),
    getRateRecord: (data) => dispatch(getRateRecord(data)),
    putRate: (data) => dispatch(putRate(data)),
    setRate: (data) => dispatch(setRate(data)),
    getOtherRate: (data) => dispatch(getOtherRate(data)),
    getOpponentUserProfile: (data) => dispatch(opponentUserProfile(data)),
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(UserVideoComponent)
