export const AllTypesProps: Record<string,any> = {
	Query:{
		readUsers:{
			where:"ReadUserInput",
			pagination:"PaginationData",
			sortBy:"SortByData"
		}
	},
	Role: "enum" as const,
	DateTime: `scalar.DateTime` as const,
	ReadUserInput:{
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
		createUser:{
			data:"CreateUserInput"
		},
		updateUser:{
			data:"UpdateUserInput",
			where:"IdInput"
		},
		deleteUser:{
			where:"IdInput"
		},
		changePassword:{
			data:"ChangePasswordInput",
			where:"IdInput"
		}
	},
	LoginInput:{

	},
	CreateUserInput:{
		role:"Role"
	},
	UpdateUserInput:{
		role:"Role"
	},
	IdInput:{

	},
	ChangePasswordInput:{

	}
}

export const ReturnTypes: Record<string,any> = {
	Query:{
		me:"UserModel",
		readUsers:"ReadUserOutput"
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
	Mutation:{
		logIn:"LoginOutput",
		createUser:"UserModel",
		updateUser:"UserModel",
		deleteUser:"SuccessOtput",
		changePassword:"SuccessOtput"
	},
	LoginOutput:{
		jwt:"String"
	},
	SuccessOtput:{
		success:"Boolean"
	}
}

export const Ops = {
query: "Query" as const,
	mutation: "Mutation" as const
}