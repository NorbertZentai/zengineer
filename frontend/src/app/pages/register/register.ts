import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  standalone: true,
  selector: 'app-register',
  templateUrl: './register.html',
  styleUrls: ['./register.scss'],
  imports: [CommonModule, FormsModule, TranslateModule, MatIconModule, RouterModule],
})
export class Register {
  email = '';
  password = '';
  name = '';
  errorMessage: string | null = null;
  isLoading = false;

  constructor(private auth: AuthService, private router: Router) {}

  async onSubmit() {
    if (this.isLoading) return;
    
    this.errorMessage = null;
    this.isLoading = true;
    
    try {
      await this.auth.register(this.email, this.password, this.name);
      await this.auth.login(this.email, this.password);
      this.router.navigateByUrl('/dashboard');
    } catch (err: any) {
      // Use the error from AuthService if available
      const authError = this.auth.lastError();
      this.errorMessage = authError?.message || 'Hiba történt a regisztráció során.';
      console.error(err);
    } finally {
      this.isLoading = false;
    }
  }
}