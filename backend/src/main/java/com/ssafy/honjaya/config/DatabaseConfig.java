package com.ssafy.honjaya.config;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.context.annotation.Configuration;

@Configuration
@MapperScan(
		basePackages = "com.ssafy.honjaya.model.mapper"
)
public class DatabaseConfig {}