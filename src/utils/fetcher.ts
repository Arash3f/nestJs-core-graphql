// import { serverAddressTest } from "@src/constants"
// import fetch from "node-fetch"

// import { Thunder } from "./zeus"

// /**
//  * * Implementation Fetch class for request to server (use in testing)
//  */
// class Fetch {
//     jwtToken: string = null

//     /**
//      * * Main point of send request
//      */
//     private thunder = Thunder(async (query, variables) => {
//         try {
//             const response = await fetch(serverAddressTest, {
//                 body: JSON.stringify({ query, variables }),
//                 method: "POST",
//                 headers: this.makeHeader(),
//             })

//             // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
//             //@ts-ignore
//             const { data, errors } = await response.json()
//             const hasError = this.hasError(errors)

//             if (hasError) throw errors

//             return data
//         } catch (err) {
//             return Promise.reject(err)
//         }
//     })

//     /**
//      * * Handling Errors in request response
//      * @param data request's response
//      * @returns result of check that res have error
//      */
//     private hasError(data: any): boolean {
//         let result = false
//         if (data) {
//             const value = Object.values(data).filter((val) => !!val)
//             result = value.length > 0 ? true : false
//         }
//         return result
//     }

//     /**
//      * * Generate header for request (add Authorization token)
//      * @returns header for request
//      */
//     private makeHeader() {
//         const token = this.jwtToken
//         const result = {
//             "Content-Type": "application/json",
//         }

//         if (token) result["Authorization"] = `jwt ${token}`

//         return result
//     }

//     /**
//      * * Common function for login to the server with username and password
//      * @param username user's username
//      * @param password user's password
//      */
//     async loginAs(username: string, password: string) {
//         const {
//             logIn: { jwt },
//         } = await this.mutation({
//             logIn: [{ data: { username, password: password } }, { jwt: true }],
//         })

//         this.jwtToken = jwt
//     }

//     mutation = this.thunder("mutation")
//     query = this.thunder("query")
// }

// export const fetchService = new Fetch()
