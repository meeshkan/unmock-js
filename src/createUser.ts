import axios from "axios";

interface IUser {
    app_metadata: any;
    connection: string;
    email: string;
    email_verified: boolean;
    password: string;
    phone_number: string;
    phone_verified: boolean;
    user_id: string;
    user_metadata: any;
    username: string;
    verify_email: boolean;
  }

export const createUser = async (username: string, email: string): Promise<IUser> => {
    const user = await axios.post( "http://my-app.eu.auth0.com/api/v2/users", {
        email,
        username,
    });
    return user.data as IUser;
};

export const deleteUser = async (id: string): Promise<boolean> => {
    await axios.delete(`http://my-app.eu.auth0.com/api/v2/users/${id}`);
    return true;
};
