package com.ssafy.honjaya.api.service;

public interface JwtService {
	<T> String createAccessToken(String key, T data);
	<T> String createRefreshToken(String key, T data);
	<T> String create(String key, T data, String subject, long expir);
//	Map<String, Object> get(String key);
//	String getId();
	int extractUserNo(String jwt);
	boolean checkToken(String jwt);
}