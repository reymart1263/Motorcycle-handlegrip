package com.motorcycle.handlegrip.data

data class UserDto(
    val name: String,
    val email: String,
    val password: String? = null,
)

data class UserListItemDto(
    val id: String,
    val name: String,
    val email: String,
)

data class FingerprintDto(
    val id: String,
    val name: String,
    val userId: String,
    val slot: Int,
)

data class AppStateDto(
    val user: UserDto,
    val usersList: List<UserListItemDto>,
    val fingerprints: List<FingerprintDto>,
)
