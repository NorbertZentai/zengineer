import { Injectable } from '@angular/core';
import PocketBase from 'pocketbase';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private pb = new PocketBase('http://localhost:8090');

  get isAuthenticated(): boolean {
    return this.pb.authStore.isValid;
  }

  get currentUser() {
    return this.pb.authStore.model;
  }

  async login(email: string, password: string): Promise<boolean> {
    try {
      await this.pb.collection('users').authWithPassword(email, password);
      return true;
    } catch (err) {
      console.error('Login failed', err);
      return false;
    }
  }

  async register(email: string, password: string, name: string): Promise<boolean> {
    try {
      await this.pb.collection('users').create({
        email,
        password,
        passwordConfirm: password,
        name,
      });
      return true;
    } catch (err) {
      console.error('Registration failed', err);
      return false;
    }
  }

  logout() {
    this.pb.authStore.clear();
  }
}