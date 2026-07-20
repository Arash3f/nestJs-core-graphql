/* eslint-disable */

export const AllTypesProps: Record<string,any> = {
	Role: "enum" as const,
	DateTime: `scalar.DateTime` as const,
	Query:{
		readUsers:{
			where:"ReadUserWhereInput",
			pagination:"PaginationData",
			sortBy:"SortByData"
		}
	},
	ReadUserWhereInput:{
		role:"Role"
	},
	PaginationData:{

	},
	SortByData:{

	},
	Mutation:{
		logIn:{
			data:"LoginInput"
		},
		register:{
			data:"RegisterInput"
		},
		changePassword:{
			data:"ChangePasswordInput",
			where:"IdInput"
		},
		changeMyPassword:{
			data:"ChangeMyPasswordInput"
		},
		refreshToken:{
			data:"RefreshTokenInput"
		},
		updateMe:{
			data:"UpdateMeInput"
		},
		createUser:{
			data:"CreateUserInput"
		},
		updateUser:{
			data:"UpdateUserDataInput",
			where:"IdInput"
		},
		deleteUser:{
			where:"IdInput"
		}
	},
	LoginInput:{

	},
	RegisterInput:{

	},
	ChangePasswordInput:{

	},
	IdInput:{

	},
	ChangeMyPasswordInput:{

	},
	RefreshTokenInput:{

	},
	UpdateMeInput:{

	},
	CreateUserInput:{
		role:"Role"
	},
	UpdateUserDataInput:{
		role:"Role"
	},
	ID: `scalar.ID` as const
}

export const ReturnTypes: Record<string,any> = {
	SuccessOutput:{
		success:"Boolean"
	},
	LoginOutput:{
		accessToken:"String",
		refreshToken:"String"
	},
	UserModel:{
		id:"ID",
		name:"String",
		username:"String",
		active:"Boolean",
		role:"Role",
		createdDate:"DateTime",
		updatedDate:"DateTime"
	},
	DateTime: `scalar.DateTime` as const,
	ReadUserOutput:{
		count:"Int",
		data:"UserModel"
	},
	Query:{
		me:"UserModel",
		readUsers:"ReadUserOutput"
	},
	Mutation:{
		logIn:"LoginOutput",
		register:"LoginOutput",
		logout:"SuccessOutput",
		changePassword:"SuccessOutput",
		changeMyPassword:"SuccessOutput",
		refreshToken:"LoginOutput",
		updateMe:"UserModel",
		createUser:"UserModel",
		updateUser:"UserModel",
		deleteUser:"SuccessOutput"
	},
	ID: `scalar.ID` as const
}

export const Ops = {
query: "Query" as const,
	mutation: "Mutation" as const
}
