package com.ssafy.honjaya.api.service;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import javax.transaction.Transactional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.ssafy.honjaya.api.request.ChatAskReq;
import com.ssafy.honjaya.api.request.ChatReq;
import com.ssafy.honjaya.api.response.ChatListRes;
import com.ssafy.honjaya.api.response.ChatRes;
import com.ssafy.honjaya.api.response.ChatroomListRes;
import com.ssafy.honjaya.api.response.ChatroomRes;
import com.ssafy.honjaya.db.entity.Chat;
import com.ssafy.honjaya.db.entity.ChatAsk;
import com.ssafy.honjaya.db.entity.Chatroom;
import com.ssafy.honjaya.db.entity.ChatroomUser;
import com.ssafy.honjaya.db.repository.ChatAskRepository;
import com.ssafy.honjaya.db.repository.ChatRepository;
import com.ssafy.honjaya.db.repository.ChatroomRepository;
import com.ssafy.honjaya.db.repository.ChatroomUserRepository;
import com.ssafy.honjaya.db.repository.UserRepository;

@Service
public class ChatServiceImpl implements ChatService {
	
	private static final int CHAT_READ_COUNT = 1;

	@Autowired
	private UserRepository userRepository;
	
	@Autowired
	private ChatRepository chatRepository;
	
	@Autowired
	private ChatAskRepository chatAskRepository;
	
	@Autowired
	private ChatroomRepository chatroomRepository;
	
	@Autowired
	private ChatroomUserRepository chatroomUserRepository;
	
	@Override
	public boolean alreadyAskedChat(ChatAskReq chatAskReq) {
		int chatAskFrom = chatAskReq.getChatAskFrom();
		int chatAskTo = chatAskReq.getChatAskTo();
		if (chatAskRepository.countByChatAskFrom_UserNoAndChatAskTo_UserNo(chatAskFrom, chatAskTo) > 0
				|| chatroomUserRepository.hasChatroomWithHim(chatAskFrom, chatAskTo) > 0) {
			return true;
		}
		return false;
	}
	
	@Override
	public boolean askChat(ChatAskReq chatAskReq) {
		int chatAskFrom = chatAskReq.getChatAskFrom();
		int chatAskTo = chatAskReq.getChatAskTo();
		if (chatAskRepository.countByChatAskFrom_UserNoAndChatAskTo_UserNo(chatAskFrom, chatAskTo) > 0
				|| chatroomUserRepository.hasChatroomWithHim(chatAskFrom, chatAskTo) > 0) {
			return false;
		}
		ChatAsk chatAsk = chatAskRepository.findByChatAskFrom_UserNoAndChatAskTo_UserNo(chatAskTo, chatAskFrom);
		if (chatAsk != null) {
			// ?????? ?????? ????????? ?????? ????????? ?????? ?????? ????????? ??? ???????????? ????????? ?????? ????????? ??? ?????? ?????? ?????? (?????? ????????? ???)
			createChatroom(chatAskFrom, chatAskTo);
			chatAskRepository.delete(chatAsk);
			return true;
		}
		chatAsk = ChatAsk.builder()
				.chatAskFrom(userRepository.getOne(chatAskFrom))
				.chatAskTo(userRepository.getOne(chatAskTo))
				.build();
		chatAskRepository.save(chatAsk);
		return false;
	}

	@Override
	public void deleteAsk(int userNo) { // ????????? ???????????? ?????? ???, ?????? ???????????? ?????? ????????? ?????? ???????????? ??? ???????????? ????????? ?????? ????????? ?????? ?????????
		chatAskRepository.deleteByChatAskTo_UserNo(userNo);
	}

	@Override
	@Transactional
	public ChatroomListRes listChatroom(int userNo) {
		List<ChatroomUser> list = chatroomUserRepository.listChatroom(userNo);
		List<ChatroomRes> resList = new ArrayList<>();
		ChatroomListRes chatroomListRes = new ChatroomListRes();
		list.forEach(e -> resList.add(new ChatroomRes(e)));
		chatroomListRes.setList(resList);
		return chatroomListRes;
	}
	
	@Override
	@Transactional
	public ChatroomRes findChatroom(long chatroomNo, int myUserNo) {
		return new ChatroomRes(chatroomUserRepository.findChatroom(chatroomNo, myUserNo));
	}

	@Override
	public void deleteChatroom(long chatroomNo) { // ??? ??? ??? ?????? ????????? ????????? ??? ??????
		chatroomRepository.deleteById(chatroomNo);
	}

	@Override
	@Transactional
	public ChatListRes getMessages(long chatroomNo, int myUserNo) {
		ChatListRes chatListRes = new ChatListRes();
		List<ChatRes> resList = new ArrayList<>();
		if (chatroomRepository.countByChatroomNo(chatroomNo) < 1) {
			resList.add(new ChatRes(myUserNo, "", "/001.png", "[??????] ???????????? ???????????? ???????????? ?????????????????????.",
					ZonedDateTime.now(ZoneId.of("Asia/Seoul")).toLocalDateTime()
							.format(DateTimeFormatter.ofPattern("a h:mm").withLocale(Locale.forLanguageTag("ko"))),
					1, false, null));
			chatListRes.setList(resList);
			return chatListRes;
		}
		List<Chat> list = chatRepository.findAllByChatroom_ChatroomNo(chatroomNo);
		list.forEach(e -> resList.add(new ChatRes(e)));
		chatListRes.setList(resList);
		return chatListRes;
	}

	@Override
	@Transactional
	public ChatRes sendMessage(ChatReq chatReq) {
		if (chatroomRepository.countByChatroomNo(chatReq.getChatroomNo()) < 1) {
			return new ChatRes(chatReq.getUserNo(), "", "/001.png", "[??????] ???????????? ???????????? ???????????? ?????????????????????.",
					ZonedDateTime.now(ZoneId.of("Asia/Seoul")).toLocalDateTime()
							.format(DateTimeFormatter.ofPattern("a h:mm").withLocale(Locale.forLanguageTag("ko"))),
					1, false, null);
		}
		Chat chat = Chat.builder()
				.chatroom(chatroomRepository.getOne(chatReq.getChatroomNo()))
				.user(userRepository.getOne(chatReq.getUserNo()))
				.chatMessage(chatReq.getChatMessage())
				.chatRead(CHAT_READ_COUNT)
				.build();
		chat = chatRepository.save(chat);
		if (chat == null) {
			return new ChatRes(chatReq.getUserNo(), "", "/001.png", "[??????] ?????? ????????? ????????? ???????????? ???????????????.",
					ZonedDateTime.now(ZoneId.of("Asia/Seoul")).toLocalDateTime()
							.format(DateTimeFormatter.ofPattern("a h:mm").withLocale(Locale.forLanguageTag("ko"))),
					1, false, null);
		}
		return new ChatRes(chat);
	}
	
	private void createChatroom(int userNo1, int userNo2) {
		Chatroom chatroom = chatroomRepository.save(new Chatroom());
		ChatroomUser chatroomUser1 = ChatroomUser.builder()
				.chatroom(chatroom)
				.user(userRepository.getOne(userNo1))
				.build();
		ChatroomUser chatroomUser2 = ChatroomUser.builder()
				.chatroom(chatroom)
				.user(userRepository.getOne(userNo2))
				.build();
		
		chatroomUserRepository.save(chatroomUser1);
		chatroomUserRepository.save(chatroomUser2);
	}
}
