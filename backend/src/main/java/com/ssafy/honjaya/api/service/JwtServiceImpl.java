package com.ssafy.honjaya.api.service;

import java.io.UnsupportedEncodingException;
import java.util.Date;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;

@Service
public class JwtServiceImpl implements JwtService {

	public static final Logger logger = LoggerFactory.getLogger(JwtServiceImpl.class);

	private static final String SALT = "ssafySecret";
//	private static final int EXPIRE_MINUTES = 60; // 토큰 만료 시간
	private static final int EXPIRE_MINUTES = 600; // 토큰 만료 시간

	// 토큰 발급 메서드를 활용한 refresh 토큰 생성
	@Override
	public <T> String createRefreshToken(String key, T data) {
		// 데이터는 별도로 넣지 않음. 유효기간만 5배로 연장
		return create(key, data, "refresh-token", EXPIRE_MINUTES * 5);
	}

	// 토큰 발급 메서드를 활용한 ACCESS 토큰 생성
	@Override
	public <T> String createAccessToken(String key, T data) {

		return create(key, data, "access-token", EXPIRE_MINUTES);
	}

	// Token 발급 메서드
	/**
	 * key : Claim에 셋팅될 key 값 data : Claim에 셋팅 될 data 값 subject : payload에 sub의
	 * value로 들어갈 subject값 expir : 토큰 유효기간 설정을 위한 값 jwt 토큰의 구성 :
	 * header+payload+signature
	 */
	@Override
	public <T> String create(String key, T data, String subject, long expir) {
		String jwt = Jwts.builder()
				// header 설정 : 토큰의 타입, 알고리즘 정보 등을 셋팅
				.setHeaderParam("typ", "JWT") // header 세팅
				.setHeaderParam("regDate", System.currentTimeMillis()) // header 세팅
				// payload 설정 : 유효기간(Expiration), 토큰 제목(Subject), 데이터(claim) 등등 담고 싶은 정보 설정
				.setExpiration(new Date(System.currentTimeMillis() + 1000 * 60 * expir)) // 토큰 유효기간 설정
				.setSubject(subject) // 토큰 제목 설정 ex) access-token, refresh-token
				.claim(key, data)
				// SIGNATURE 설정 : secret key를 이용한 암호화
				.signWith(SignatureAlgorithm.HS256, this.generateKey()).compact();// 직렬화 처리
		logger.debug("토큰 발생! : {}", jwt);
		return jwt;
	}

	// signature 설정에 들어갈 key 생성
	private byte[] generateKey() {
		byte[] key = null;
		try {
			// byte 코드로 인코딩 해주기
			// 캐릭터셋 인자로 안주면 사용자 플랫폼의 기본 인코딩 설정대로 인코딩
			key = SALT.getBytes("UTF-8");
		} catch (UnsupportedEncodingException e) {
			if (logger.isInfoEnabled()) {
				e.printStackTrace();
			} else {
				logger.error("Making JWT Key Error ::: {}", e.getMessage());
			}
		}

		return key;
	}

	// 전달 받은 토큰이 제대로 생성된것인지 확인 하고 문제가 있다면Exception을 발생.
	@Override
	public boolean checkToken(String jwt) {
		if (jwt == null || jwt.isEmpty()) { // Exception 발생 로직도 고민
			return false;
		}
		try {
			// Json Web Signature? 서버에서 인증을 근거로 인증정보를 서버의 private key로 서명 한것을 토큰화 한것
			// setSigningKey : JWS 서명 검증을 위한 secretkey 셋팅
			// parseClaimsJws : 파싱하여 원본 jws 만들기
			Jws<Claims> claims = Jwts.parser().setSigningKey(this.generateKey()).parseClaimsJws(jwt);
			// Claims 는 Map의 구현체 형태
			logger.info("claims: {}", claims);
			return true;
		} catch (Exception e) {
			logger.error(e.getMessage());
			return false;
		}
	}
	
	@Override
	public int extractUserNo(String jwt) {
		Jws<Claims> claims = null;
		int userNo = -1;
		try {
			claims = Jwts.parser().setSigningKey(SALT.getBytes("UTF-8")).parseClaimsJws(jwt);
			userNo = (int) claims.getBody().get("userNo");
		} catch (Exception e) {
			logger.error(e.getMessage());
			userNo = -1;
		}
		return userNo;
	}
}
