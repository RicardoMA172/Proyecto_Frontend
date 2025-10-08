import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Hum } from './hum';

describe('Hum', () => {
  let component: Hum;
  let fixture: ComponentFixture<Hum>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Hum]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Hum);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
