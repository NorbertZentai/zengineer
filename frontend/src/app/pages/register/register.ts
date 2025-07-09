import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  standalone: true,
  selector: 'app-register',
  templateUrl: './register.html',
  styleUrls: ['./register.scss'],
  imports: [CommonModule, FormsModule, TranslateModule],
})
export class Register {
  email = '';
  password = '';
  name = '';
  errorMessage: string | null = null;

  constructor(private auth: AuthService, private router: Router) {}

  async onSubmit() {
    try {
      await this.auth.register(this.email, this.password, this.name);
      await this.auth.login(this.email, this.password);
      this.router.navigateByUrl('/dashboard');
    } catch (err: any) {
      this.errorMessage = 'Hiba történt a regisztráció során.';
      console.error(err);
    }
  }
}