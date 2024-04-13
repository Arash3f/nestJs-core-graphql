import { INestApplication } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AppModule } from "@src/app.module";
import { EnvConfigService } from "@src/modules/config/env-config.service";
import { PrismaService } from "@src/modules/prisma/prisma.service";
import { Role } from "@src/utils/graphql/zeus";
import hasha from "hasha";
import { AuthErrors } from "@src/modules/auth/constants/errors";
import { TokenGuard } from "@src/common/guards/token.guard";
import { JwtPayloadType } from "@src/common/types/token.type";
import { fetchService } from "@src/utils/graphql/fetcher";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing"

describe("Auth Module", () => {
  let app: INestApplication
  let prisma: PrismaService
  let apiConfig: EnvConfigService
  let jwt: JwtService;

  /**
   * * FakeId used for some test that need dummy uuid
   */
  const FAKEID = "98a753df-bf91-45f0-914f-35acd9966ad5";

  /**
   * * Create a Instance of project
   */
  async function createApp() {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()
    
    app = await NestFactory.create<NestFastifyApplication>(
      AppModule,
      new FastifyAdapter(),
    )

    /**
     * * For access to project modules, we need to config servicess interface
     */
    apiConfig = app.get(EnvConfigService)
    prisma = app.get(PrismaService)
    jwt = app.get(JwtService);

    app.useGlobalGuards(new TokenGuard(jwt, prisma, apiConfig));

    await app.listen(apiConfig.serverPort);
  }

  beforeAll(async () => {
    await createApp()
    fetchService.setApiConfig(apiConfig)
    fetchService.setPrismaClient(prisma)
  });

  beforeEach(async () => {
    fetchService.setAnonymousMode()
    await fetchService.resetDatabase()
    await fetchService.createSuperUser()
    await fetchService.createMemberUser()
  });

  afterAll(async () => {
    await prisma.$disconnect()
    await app.close()
  });

  /**
   * ! logIn API
   */

  it("+ login User Successfuly", async () => {
    const username = apiConfig.defaultSuperUser.username
    const password = apiConfig.defaultSuperUser.password
    /**
     * * Login User
     */
    const { logIn: { jwt: userJWT } } = await fetchService.mutation({
      logIn: [
        {
          data: {
            username,
            password,
          },
        },
        {
          jwt: true,
        },
      ],
    });

    /**
     * * Verify Jwt
     */
    const bodyData: JwtPayloadType = jwt.verify(userJWT, {
      secret: apiConfig.jwtSecret,
      ignoreExpiration: true,
    });

    if (bodyData) {
      const userId = bodyData.id;
      const foundUser = await prisma.users.findUnique({ where: { id: userId } });

      /**
       * * Final cehck
       */
      expect(foundUser.username).toEqual(username);
      return true;
    }

    /**
     * * Invalid Jwt
     */
    fail("Invalid Token");
  });

  it("- login User UnSuccessfuly (Incorect Username)", async () => {
    try {
      await fetchService.mutation({
        logIn: [
          {
            data: {
              /**
               * * Test username
               */
              username: "test",
              password: "dashdghaksgjd",
            },
          },
          {
            jwt: true,
          },
        ],
      });
      fail("Incorrect Validation");
    } catch (error) {
      delete error[0].timestamp;
      expect(error[0]).toEqual(AuthErrors.IncorrectUsernameOrPassword);
    }
  });

  it("- login User UnSuccessfuly (Incorect password)", async () => {
    const username = apiConfig.defaultSuperUser.username

    try {
      await fetchService.mutation({
        logIn: [
          {
            data: {
              username: username,
              /**
               * * Fake password
               */
              password: "asfdugahdadohasidgha",
            },
          },
          {
            jwt: true,
          },
        ],
      });
      fail("Incorrect Validation");
    } catch (error) {
      delete error[0].timestamp;
      expect(error[0]).toEqual(AuthErrors.IncorrectUsernameOrPassword);
    }
  });

  /**
   * ! me API
   */

  it("+ Me API Successfuly", async () => {
    const username = apiConfig.defaultSuperUser.username
    const password = apiConfig.defaultSuperUser.password

    /**
     * * Find default user object from db
     */
    const user = await prisma.users.findUnique({
      where: {
        username,
      },
      select: {
        active: true,
        id: true,
        name: true,
        role: true,
        username: true,
      },
    });

    /**
     * * Login as user
     */
    await fetchService.loginAs(username, password);

    /**
     * * Request to server
     */
    const { me: userMe } = await fetchService.query({
      me: {
        active: true,
        id: true,
        name: true,
        username: true,
        role: true,
      },
    });

    /**
     * * Check actual user object is equal with response
     */
    expect(userMe).toEqual(user);
  });

  it("- Me API  UnSuccessfuly (Inactive user)", async () => {
    const username = apiConfig.defaultMemberUser.username
    const password = apiConfig.defaultMemberUser.password

    /**
     * * Login as default user
     */
    await fetchService.loginAs(username, password);

    /**
     * * Inactive default user
     */
    await prisma.users.update({
      where: {
        username,
      },
      data: {
        active: false,
      },
    });

    try {
      /**
       * * Request to server
       */
      await fetchService.query({
        me: {
          active: true,
          id: true,
          name: true,
          username: true,
          role: true,
        },
      });
      fail("Incorrect Guard");
    } catch (error) {
      delete error[0].timestamp;
      expect(error[0]).toEqual(AuthErrors.UserIsNotAuthorized);
    }
  });

  /**
   * ! readUsers API
   */

  it("+ ReadUsers API Successfuly", async () => {
    /**
     * * Create default user
     */
    const defaultUserPassword = "defaultUser";
    const defaultUserPasswordHashed = await hasha.async(defaultUserPassword, { algorithm: "sha1" });
    const defaultUser = await prisma.users.create({
      data: {
        name: "defaultuser",
        password: defaultUserPasswordHashed,
        role: Role.Admin,
        username: "defaultuser",
      },
    });

    /**
     * * Create some euser
     */
    const userPass01 = "user01";
    const userPassword01 = await hasha.async(userPass01, { algorithm: "sha1" });
    const user01 = await prisma.users.create({
      data: {
        name: "uUsS00001798465489484",
        password: userPassword01,
        role: Role.Member,
        username: "user01",
      },
    });

    const userPass02 = "user02";
    const userPassword02 = await hasha.async(userPass02, { algorithm: "sha1" });
    const user02 = await prisma.users.create({
      data: {
        name: "user02",
        password: userPassword02,
        role: Role.Admin,
        username: "AAsspvoijvdiodfV--78941684",
      },
    });

    const userPass03 = "user03";
    const userPassword03 = await hasha.async(userPass03, { algorithm: "sha1" });
    const user03 = await prisma.users.create({
      data: {
        name: "user03",
        password: userPassword03,
        role: Role.Admin,
        username: "user03",
        active: false,
      },
    });

    /**
     * * Login as default user
     */
    await fetchService.loginAs(defaultUser.username, defaultUserPassword);

    const { readUsers: userCount } = await fetchService.query({
      readUsers: [
        {},
        {
          count: true,
          data: {
            id: true,
          },
        },
      ],
    });
    expect(userCount.count).toBe(6);
    expect(userCount.data.length).toBe(6);

    /**
     * * Filter name
     */
    const { readUsers: findUser01 } = await fetchService.query({
      readUsers: [
        {
          where: {
            name: "UsS00",
          },
        },
        {
          count: true,
          data: {
            id: true,
          },
        },
      ],
    });
    expect(findUser01.data[0].id).toBe(user01.id);
    expect(findUser01.count).toBe(1);

    /**
     * * Filter username
     */
    const { readUsers: findUser02 } = await fetchService.query({
      readUsers: [
        {
          where: {
            username: "diodfV--78",
          },
        },
        {
          count: true,
          data: {
            id: true,
          },
        },
      ],
    });
    expect(findUser02.count).toBe(1);
    expect(findUser02.data[0].id).toBe(user02.id);

    /**
     * * Filter active
     */
    const { readUsers: findUser03 } = await fetchService.query({
      readUsers: [
        {
          where: {
            active: false,
          },
        },
        {
          count: true,
          data: {
            id: true,
          },
        },
      ],
    });
    expect(findUser03.count).toBe(1);
    expect(findUser03.data[0].id).toBe(user03.id);

    /**
     * * Filter role
     */
    const { readUsers: findUser04 } = await fetchService.query({
      readUsers: [
        {
          where: {
            role: Role.Member,
          },
        },
        {
          count: true,
          data: {
            id: true,
          },
        },
      ],
    });
    expect(findUser04.count).toBe(2);
    expect(findUser04.data[1].id).toBe(user01.id);
  });

  /**
   * ! createUser API
   */

  it("+ CreateUser API Successfuly", async () => {
    /**
     * * Create default user
     */
    const defaultUserPassword = "defaultUser";
    const defaultUserPasswordHashed = await hasha.async(defaultUserPassword, { algorithm: "sha1" });
    const defaultUser = await prisma.users.create({
      data: {
        name: "defaultuser",
        password: defaultUserPasswordHashed,
        role: Role.Admin,
        username: "defaultuser",
      },
    });

    /**
     * * Login User
     */
    await fetchService.loginAs(defaultUser.username, defaultUserPassword);
    const userPassword = "user01";
    const { createUser: user01 } = await fetchService.mutation({
      createUser: [
        {
          data: {
            name: "user01",
            password: userPassword,
            role: Role.Member,
            username: "user01",
          },
        },
        {
          id: true,
          name: true,
          username: true,
          role: true,
        },
      ],
    });

    const userList = await prisma.users.findFirst({
      where: {
        id: user01.id,
      },
    });

    expect(userList.id).toBe(user01.id);
    expect(userList.name).toBe(user01.name);
    expect(userList.role).toBe(user01.role);
    expect(userList.username).toBe(user01.username);

    /**
     * * Check password
     */
    const hashedPassword = await hasha.async(userPassword, { algorithm: "sha1" });
    expect(userList.password).toBe(hashedPassword);
  });

  it("- CreateUser API UnSuccessfuly (Member user)", async () => {
    /**
     * * Create default user
     */
    const defaultUserPassword = "defaultUser";
    const defaultUserPasswordHashed = await hasha.async(defaultUserPassword, { algorithm: "sha1" });
    const defaultUser = await prisma.users.create({
      data: {
        name: "defaultuser",
        password: defaultUserPasswordHashed,
        role: Role.Admin,
        username: "defaultuser",
      },
    });

    /**
     * * Login User
     */
    await fetchService.loginAs(defaultUser.username, defaultUserPassword);

    /**
     * * Inactive User
     */
    await prisma.users.update({
      where: {
        username: defaultUser.username,
      },
      data: {
        active: false,
      },
    });

    try {
      /**
       * * Request to server
       */
      await fetchService.mutation({
        createUser: [
          {
            data: {
              password: "",
              name: "asdsad",
              username: "sadasd",
              role: Role.Admin,
            },
          },
          {
            id: true,
          },
        ],
      });
      fail("Incorrect guard");
    } catch (error) {
      delete error[0].timestamp;
      expect(error[0]).toEqual(AuthErrors.AccessDenied);
    }
  });

  it("- CreateUser API UnSuccessfuly (username is duplicated)", async () => {
    /**
     * * Create default user
     */
    const defaultUserPassword = "defaultUser";
    const defaultUserPasswordHashed = await hasha.async(defaultUserPassword, { algorithm: "sha1" });
    const defaultUser = await prisma.users.create({
      data: {
        name: "defaultuser",
        password: defaultUserPasswordHashed,
        role: Role.Admin,
        username: "defaultuser",
      },
    });

    /**
     * * User new user
     */
    const userPassword01 = "user01";
    const userPassword = await hasha.async(userPassword01, { algorithm: "sha1" });
    const user = await prisma.users.create({
      data: {
        name: "user01",
        password: userPassword,
        role: Role.Member,
        username: "user01",
      },
    });

    /**
     * * login as default user
     */
    await fetchService.loginAs(defaultUser.username, defaultUserPassword);

    try {
      /**
       * * request to server
       */
      await fetchService.mutation({
        createUser: [
          {
            data: {
              name: "user02",
              password: "user02",
              role: Role.Member,
              username: user.username,
            },
          },
          {
            id: true,
          },
        ],
      });
      fail("Incorrect Validation");
    } catch (error) {
      delete error[0].timestamp;
      expect(error[0]).toEqual(AuthErrors.UsernameIsDuplicated);
    }
  });

  /**
   * ! UpdateUser API
   */

  it("+ UpdateUser API Successfuly", async () => {
    /**
     * * Create default user
     */
    const defaultUserPassword = "defaultUser";
    const defaultUserPasswordHashed = await hasha.async(defaultUserPassword, { algorithm: "sha1" });
    const defaultUser = await prisma.users.create({
      data: {
        name: "defaultuser",
        password: defaultUserPasswordHashed,
        role: Role.Admin,
        username: "defaultuser",
      },
    });

    /**
     * * Create som euser
     */
    const userPass01 = "user01";
    const userPassword01 = await hasha.async(userPass01, { algorithm: "sha1" });
    const user01 = await prisma.users.create({
      data: {
        name: "uUsS00001798465489484",
        password: userPassword01,
        role: Role.Member,
        username: "user01",
      },
    });
    /**
     * * login as default user
     */
    await fetchService.loginAs(defaultUser.username, defaultUserPassword);

    /**
     * * Request to server
     */
    const { updateUser: updateUser01 } = await fetchService.mutation({
      updateUser: [
        {
          where: {
            id: user01.id,
          },
          data: {
            active: false,
            name: "updatedUser",
            username: "UpdatedUserName",
            role: Role.Admin,
          },
        },
        {
          active: true,
          id: true,
          name: true,
          role: true,
          username: true,
        },
      ],
    });
    const findUser = await prisma.users.findUnique({
      where: {
        id: updateUser01.id,
      },
    });
    expect(findUser.id).toBe(updateUser01.id);
    expect(findUser.active).toBe(updateUser01.active);
    expect(findUser.name).toBe(updateUser01.name);
    expect(findUser.username).toBe(updateUser01.username);
    expect(findUser.role).toBe(updateUser01.role);
  });

  it("- UpdateUser API UnSuccessfuly (Member user)", async () => {
    const user01Password = "user01";
    const userPassword = await hasha.async(user01Password, { algorithm: "sha1" });

    /**
     * * Create new user
     */
    const user01 = await prisma.users.create({
      data: {
        name: "user01",
        password: userPassword,
        role: Role.Member,
        username: "user01",
      },
    });

    /**
     * * Login as default user
     */
    await fetchService.loginAs(user01.username, user01Password);

    try {
      /**
       * * Request to server
       */
      await fetchService.mutation({
        updateUser: [
          {
            where: {
              id: user01.id,
            },
            data: {
              active: false,
              name: "updatedUser",
              username: "UpdatedUserName",
              role: Role.Admin,
            },
          },
          {
            id: true,
          },
        ],
      });
      fail("Incorrect Guard");
    } catch (error) {
      delete error[0].timestamp;
      expect(error[0]).toEqual(AuthErrors.AccessDenied);
    }
  });

  it("- UpdateUser API UnSuccessfuly (UserNotFound)", async () => {
    /**
     * * Create default user
     */
    const defaultUserPassword = "defaultUser";
    const defaultUserPasswordHashed = await hasha.async(defaultUserPassword, { algorithm: "sha1" });
    const defaultUser = await prisma.users.create({
      data: {
        name: "defaultuser",
        password: defaultUserPasswordHashed,
        role: Role.Admin,
        username: "defaultuser",
      },
    });

    const user01Password = "user01";
    const userPassword = await hasha.async(user01Password, { algorithm: "sha1" });

    /**
     * * Create new user
     */
    const user01 = await prisma.users.create({
      data: {
        name: "user01",
        password: userPassword,
        role: Role.Member,
        username: "user01",
      },
    });

    /**
     * * Login as default user
     */
    await fetchService.loginAs(defaultUser.username, defaultUserPassword);

    try {
      /**
       * * Request to server
       */
      await fetchService.mutation({
        updateUser: [
          {
            where: {
              id: FAKEID,
            },
            data: {
              active: false,
              name: "updatedUser",
              username: "UpdatedUserName",
              role: Role.Admin,
            },
          },
          {
            id: true,
          },
        ],
      });
      fail("Incorrect Validation");
    } catch (error) {
      delete error[0].timestamp;
      expect(error[0]).toEqual(AuthErrors.UserNotFound);
    }
  });

  it("- UpdateUser API UnSuccessfuly (UsernameIsDuplicated)", async () => {
    /**
     * * Create default user
     */
    const defaultUserPassword = "defaultUser";
    const defaultUserPasswordHashed = await hasha.async(defaultUserPassword, { algorithm: "sha1" });
    const defaultUser = await prisma.users.create({
      data: {
        name: "defaultuser",
        password: defaultUserPasswordHashed,
        role: Role.Admin,
        username: "defaultuser",
      },
    });

    const user01Password = "user01";
    const userPassword = await hasha.async(user01Password, { algorithm: "sha1" });

    /**
     * * Create some user
     */
    const user01 = await prisma.users.create({
      data: {
        name: "user01",
        password: userPassword,
        role: Role.Member,
        username: "user01",
      },
    });

    const user02Password = "user02";
    const userPassword02 = await hasha.async(user02Password, { algorithm: "sha1" });
    const user02 = await prisma.users.create({
      data: {
        name: "user02",
        password: userPassword02,
        role: Role.Member,
        username: "user02",
      },
    });

    /**
     * * Login as default user
     */
    await fetchService.loginAs(defaultUser.username, defaultUserPassword);

    try {
      /**
       * * Request to server
       */
      await fetchService.mutation({
        updateUser: [
          {
            where: {
              id: user01.id,
            },
            data: {
              active: false,
              name: "updatedUser",
              username: user02.username,
              role: Role.Admin,
            },
          },
          {
            id: true,
          },
        ],
      });
      fail("Incorrect Validation");
    } catch (error) {
      delete error[0].timestamp;
      expect(error[0]).toEqual(AuthErrors.UsernameIsDuplicated);
    }
  });

  /**
   * ! DeleteUser API
   */

  it("+ DeleteUser API Successfuly", async () => {
    /**
     * * Create default user
     */
    const defaultUserPassword = "defaultUser";
    const defaultUserPasswordHashed = await hasha.async(defaultUserPassword, { algorithm: "sha1" });
    const defaultUser = await prisma.users.create({
      data: {
        name: "defaultuser",
        password: defaultUserPasswordHashed,
        role: Role.Admin,
        username: "defaultuser",
      },
    });

    /**
     * * Create some euser
     */
    const userPass01 = "user01";
    const userPassword01 = await hasha.async(userPass01, { algorithm: "sha1" });
    const user01 = await prisma.users.create({
      data: {
        name: "uUsS00001798465489484",
        password: userPassword01,
        role: Role.Member,
        username: "user01",
      },
    });

    /**
     * * Login as default user
     */
    await fetchService.loginAs(defaultUser.username, defaultUserPassword);

    /**
     * * Request to server
     */
    await fetchService.mutation({
      deleteUser: [
        {
          where: {
            id: user01.id,
          },
        },
        {
          success: true,
        },
      ],
    });

    const findUser = await prisma.users.count({
      where: {
        id: user01.id,
        active: true,
      },
    });

    expect(findUser).toBe(0);
  });

  it("- DeleteUser API UnSuccessfuly (Member user)", async () => {
    const user01Password = "user01";
    const userPassword = await hasha.async(user01Password, { algorithm: "sha1" });

    /**
     * * Create new user
     */
    const user01 = await prisma.users.create({
      data: {
        name: "user01",
        password: userPassword,
        role: Role.Member,
        username: "user01",
      },
    });

    /**
     * * Login as default user
     */
    await fetchService.loginAs(user01.username, user01Password);

    try {
      /**
       * * Request to server
       */
      await fetchService.mutation({
        deleteUser: [
          {
            where: {
              id: user01.id,
            },
          },
          {
            success: true,
          },
        ],
      });
      fail("Incorrect Guard");
    } catch (error) {
      delete error[0].timestamp;
      expect(error[0]).toEqual(AuthErrors.AccessDenied);
    }
  });

  it("- DeleteUser API UnSuccessfuly (UserNotFound)", async () => {
    /**
     * * Create default user
     */
    const defaultUserPassword = "defaultUser";
    const defaultUserPasswordHashed = await hasha.async(defaultUserPassword, { algorithm: "sha1" });
    const defaultUser = await prisma.users.create({
      data: {
        name: "defaultuser",
        password: defaultUserPasswordHashed,
        role: Role.Admin,
        username: "defaultuser",
      },
    });

    const user01Password = "user01";
    const userPassword = await hasha.async(user01Password, { algorithm: "sha1" });

    /**
     * * Create new user
     */
    await prisma.users.create({
      data: {
        name: "user01",
        password: userPassword,
        role: Role.Member,
        username: "user01",
      },
    });

    /**
     * * Login as default user
     */
    await fetchService.loginAs(defaultUser.username, defaultUserPassword);

    try {
      /**
       * * Request to server
       */
      await fetchService.mutation({
        deleteUser: [
          {
            where: {
              id: FAKEID,
            },
          },
          {
            success: true,
          },
        ],
      });
      fail("Incorrect Validation");
    } catch (error) {
      delete error[0].timestamp;
      expect(error[0]).toEqual(AuthErrors.UserNotFound);
    }
  });

  /**
   * ! ChangePassword API
   */

  it("+ ChangePassword API Successfuly", async () => {
    /**
     * * Create default user
     */
    const defaultUserPassword = "defaultUser";
    const defaultUserPasswordHashed = await hasha.async(defaultUserPassword, { algorithm: "sha1" });
    const defaultUser = await prisma.users.create({
      data: {
        name: "defaultuser",
        password: defaultUserPasswordHashed,
        role: Role.Admin,
        username: "defaultuser",
      },
    });

    /**
     * * Create new user
     */
    const userPass01 = "user01";
    const userPassword01 = await hasha.async(userPass01, { algorithm: "sha1" });
    const user01 = await prisma.users.create({
      data: {
        name: "uUsS00001798465489484",
        password: userPassword01,
        role: Role.Member,
        username: "user01",
      },
    });

    /**
     * * Login as default user
     */
    await fetchService.loginAs(defaultUser.username, defaultUserPassword);

    /**
     * * Request to server
     */
    const newPassword = "123456789";
    await fetchService.mutation({
      changePassword: [
        {
          where: {
            id: user01.id,
          },
          data: {
            newPassword,
          },
        },
        {
          success: true,
        },
      ],
    });

    const findUser = await prisma.users.findUnique({
      where: {
        id: user01.id,
      },
    });
    expect(findUser.id).toBe(user01.id);

    const hashedPassword = await hasha.async(newPassword, { algorithm: "sha1" });
    expect(findUser.password).toBe(hashedPassword);
  });

  it("- ChangePassword API UnSuccessfuly (Member user)", async () => {
    const user01Password = "user01";
    const userPassword = await hasha.async(user01Password, { algorithm: "sha1" });

    /**
     * * Create new user
     */
    const user01 = await prisma.users.create({
      data: {
        name: "user01",
        password: userPassword,
        role: Role.Member,
        username: "user01",
      },
    });

    /**
     * * Login as default user
     */
    await fetchService.loginAs(user01.username, user01Password);

    try {
      /**
       * * Request to server
       */
      await fetchService.mutation({
        changePassword: [
          {
            where: {
              id: user01.id,
            },
            data: {
              newPassword: "123456789",
            },
          },
          {
            success: true,
          },
        ],
      });
      fail("Incorrect Guard");
    } catch (error) {
      delete error[0].timestamp;
      expect(error[0]).toEqual(AuthErrors.AccessDenied);
    }
  });

  it("- ChangePassword API UnSuccessfuly (UserNotFound)", async () => {
    /**
     * * Create default user
     */
    const defaultUserPassword = "defaultUser";
    const defaultUserPasswordHashed = await hasha.async(defaultUserPassword, { algorithm: "sha1" });
    const defaultUser = await prisma.users.create({
      data: {
        name: "defaultuser",
        password: defaultUserPasswordHashed,
        role: Role.Admin,
        username: "defaultuser",
      },
    });

    const user01Password = "user01";
    const userPassword = await hasha.async(user01Password, { algorithm: "sha1" });

    /**
     * * Create new user
     */
    await prisma.users.create({
      data: {
        name: "user01",
        password: userPassword,
        role: Role.Member,
        username: "user01",
      },
    });

    /**
     * * Login as default user
     */
    await fetchService.loginAs(defaultUser.username, defaultUserPassword);

    try {
      // request to server
      await fetchService.mutation({
        changePassword: [
          {
            where: {
              id: FAKEID,
            },
            data: {
              newPassword: "123456789",
            },
          },
          {
            success: true,
          },
        ],
      });
      fail("Incorrect Validation");
    } catch (error) {
      delete error[0].timestamp;
      expect(error[0]).toEqual(AuthErrors.UserNotFound);
    }
  });
});
